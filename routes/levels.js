const express = require('express');
const router = express.Router();
const { getLevels, getLevel, createLevel, updateLevel, deleteLevel, setUserLevel } = require('../controllers/levelController');
const { protect, adminOnly } = require('../middleware/auth');

// public list
router.get('/', getLevels);

// admin manage
router.post('/', protect, adminOnly, createLevel);          // create new level
router.get('/:id', protect, adminOnly, getLevel);            // view single level details
router.put('/:id', protect, adminOnly, updateLevel);         // update existing level
router.delete('/:id', protect, adminOnly, deleteLevel);      // remove a level

// admin can manually adjust a user's level
router.put('/user/:userId', protect, adminOnly, setUserLevel);

module.exports = router;