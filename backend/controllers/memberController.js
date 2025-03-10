const { Member, sequelize, ParentTable, User, MemberParentTable } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get all members (with optional gender filter)
exports.getAllMembers = async (req, res) => {
    try {
        const { gender } = req.query; // Extract gender query parameter

        const whereCondition = gender ? { gender } : {}; // Filter only if gender is provided

        const members = await Member.findAll({
            where: whereCondition, // Apply the condition dynamically
            include: [
                {
                    model: User,
                    as: 'verifier',
                    attributes: ['id', 'username']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get single member
exports.getMemberById = async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.status(200).json({
            success: true,
            data: member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create a new member with image upload
exports.createMember = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        console.log("Request Body:", req.body);
        
        // Handle is_verified and related fields
        let isVerified = false;
        if (typeof req.body.is_verified === 'string') {
            isVerified = req.body.is_verified.toLowerCase() === 'yes' || req.body.is_verified.toLowerCase() === 'true';
        } else if (typeof req.body.is_verified === 'boolean') {
            isVerified = req.body.is_verified;
        }

        const memberData = {
            ...req.body,
            is_verified: isVerified,
            verified_at: isVerified ? new Date() : null,
            verified_by: isVerified ? req.user?.id : null,
            parent_id: null // No marriage handling here
        };

        // Handle profile image path
        if (req.file) {
            memberData.profile_image = `/images/member-images/${req.file.filename}`;
        } else {
            memberData.profile_image = null;
        }
        
        const member = await Member.create(memberData, { transaction: t });

        await t.commit();

        // Fetch the complete member data
        const completeMember = await Member.findByPk(member.id);

        res.status(201).json({
            success: true,
            data: completeMember
        });
    } catch (error) {
        await t.rollback();
        
        if (req.file) {
            fs.unlink(path.join('public/images/member-images', req.file.filename), (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }
        
        console.error("Database Error:", error); 
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update the member with image upload - needs to handle parent_id
exports.updateMember = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        console.log("Update Request Body:", req.body);

        // Handle is_verified and related fields
        let isVerified = member.is_verified; // Default to existing value
        if (typeof req.body.is_verified === 'string') {
            isVerified = req.body.is_verified.toLowerCase() === 'yes' || req.body.is_verified.toLowerCase() === 'true';
        } else if (typeof req.body.is_verified === 'boolean') {
            isVerified = req.body.is_verified;
        }

        const updatedData = {
            ...req.body,
            is_verified: isVerified,
            verified_at: isVerified ? new Date() : member.verified_at,
            verified_by: isVerified ? req.user?.id : member.verified_by
        };

        // Handle profile image update
        if (req.file) {
            updatedData.profile_image = `/images/member-images/${req.file.filename}`;
            if (member.profile_image) {
                fs.unlink(path.join('public', member.profile_image), (err) => {
                    if (err) console.error("Error deleting old profile image:", err);
                });
            }
        }

        await member.update(updatedData, { transaction: t });
        await t.commit();

        res.status(200).json({
            success: true,
            data: member
        });

    } catch (error) {
        await t.rollback();
        
        if (req.file) {
            fs.unlink(path.join('public/images/member-images', req.file.filename), (err) => {
                if (err) console.error("Error deleting uploaded file:", err);
            });
        }

        console.error("Database Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete member (with complete relationship cleanup)
exports.deleteMember = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        // First find the member without eager loading
        const member = await Member.findByPk(id);

        if (!member) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Delete associated image if exists
        if (member.profile_image) {
            const imagePath = path.join('public', member.profile_image);
            fs.unlink(imagePath, (err) => {
                if (err && err.code !== 'ENOENT') console.error("Error deleting file:", err);
            });
        }

        // Find marriages where this member is husband or wife
        const husbandMarriages = await ParentTable.findAll({
            where: { husband_id: id },
            transaction: t
        });
        
        const wifeMarriages = await ParentTable.findAll({
            where: { wife_id: id },
            transaction: t
        });

        // Handle MemberParentTable junction records
        await MemberParentTable.destroy({
            where: {
                [Op.or]: [
                    { child_id: id },
                    { parent_id: id }
                ]
            },
            transaction: t
        });

        // Handle husband marriages
        for (const marriage of husbandMarriages) {
            if (marriage.wife_id) {
                const wife = await Member.findByPk(marriage.wife_id);
                if (wife) {
                    // Update wife's parent_id to remove this marriage
                    const wifeParentIds = wife.parent_id ? 
                        wife.parent_id.split(',').map(Number).filter(pid => pid !== marriage.id) : 
                        [];
                    
                    await wife.update({ 
                        parent_id: wifeParentIds.length > 0 ? wifeParentIds.join(',') : null,
                        marital_status: wifeParentIds.length > 0 ? wife.marital_status : 'single'
                    }, { transaction: t });
                }
            }
            // Delete the marriage record
            await marriage.destroy({ transaction: t });
        }

        // Handle wife marriages
        for (const marriage of wifeMarriages) {
            if (marriage.husband_id) {
                const husband = await Member.findByPk(marriage.husband_id);
                if (husband) {
                    // Update husband's parent_id to remove this marriage
                    const husbandParentIds = husband.parent_id ? 
                        husband.parent_id.split(',').map(Number).filter(pid => pid !== marriage.id) : 
                        [];
                    
                    await husband.update({ 
                        parent_id: husbandParentIds.length > 0 ? husbandParentIds.join(',') : null,
                        marital_status: husbandParentIds.length > 0 ? husband.marital_status : 'single'
                    }, { transaction: t });
                }
            }
            // Delete the marriage record
            await marriage.destroy({ transaction: t });
        }

        // Now delete the member
        await member.destroy({ transaction: t });

        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Member and associated records deleted successfully'
        });
    } catch (error) {
        await t.rollback();
        console.error('Delete member error:', error); // Log the full error
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};