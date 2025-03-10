const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
    try {
        let token;

        //check if token exist in headers
        if (req.headers.authorization && 
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            //verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            //Get user from token and check if it's admin
            const user = await User.findByPk(decoded.id);
            
            console.log('Decoded Token:', decoded);
            console.log('Fetched User:', user);
    

            if (!user || user.role !== 'admin') {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to access this route'
                });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

module.exports = { protect };