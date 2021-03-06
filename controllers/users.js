const express = require('express')
const router = express.Router()
const db = require('../models')     // link to database
const bcrypt = require('bcrypt')        // need to require bcrypt in order to use it to hash passwords
const cryptojs = require('crypto-js')       // require crypto-js for cookie encrpytion?
require('dotenv').config()

// READ profile page with areas, reports, and favorites linked to user
router.get('/profile/:id', async (req, res)=>{
    try {
        // link to reports and area from user
        const foundUserReports = await db.user.findOne({
            where: {id: req.params.id},
            include: {
                model: db.report,
                include: {
                    model: db.area
                }
            }
        })

        // link to favorites list from user
        const foundUserFaves = await db.user.findOne({
            where: {id: req.params.id},
            include: {
                model: db.favorite
            }
        })

        res.render('users/profile.ejs', {
            reports: foundUserReports.reports,
            faves: foundUserFaves.favorites
        })
    } catch (err) {
        console.log('error loading profile page', err)
    }
})

// READ new user page
router.get('/new', (req, res)=>{
    res.render('users/new.ejs');
})

// CREATE new user
router.post('/', async (req, res)=>{
    const [newUser, created] = await db.user.findOrCreate({
        where: {
            email: req.body.email,
            username: req.body.username
        },
        // defaults: {password: req.body.password}----did not use this for security purposes
    })
    if(!created){
        console.log('user already exists!')
        // render the login page and send an appropriate message
    } else {
        // hash the user
        const hashedPassword = bcrypt.hashSync(req.body.password, 10)
        newUser.password = hashedPassword
        await newUser.save()        // need to save the user to update their info with the hashed password

        // encrypt the user id via AES (adv encrpyt standard) - it takes two arguments 1. the encrypted user id (as a string), 2. secret that is linked with that specific
        const encryptedUserId = cryptojs.AES.encrypt(newUser.id.toString(), process.env.SECRET)
        const encryptedUserIdString = encryptedUserId.toString()
        console.log(encryptedUserIdString)
        // store the encrypted ID in the cookie of the response object
        // created new key:value pair (userId: encrypedUserString)
        res.cookie('userId', encryptedUserIdString)
        // redirect back to the home page
        res.redirect('/')
    }
})

// READ log in page
router.get('/login', (req, res)=>{
    res.render('users/login.ejs', {error: null})
})

// log in
router.post('/login', async (req, res)=>{
    const user = await db.user.findOne({
        where: { email: req.body.email } 
    })
    if (!user) {
        console.log('User not found')           // would not want to show this on the front end
        res.render('users/login.ejs', {error: 'Invalid email/password'})
    } else if (!bcrypt.compareSync(req.body.password, user.password)) {
        console.log('Incorrect Password')       // would not want to show this on the front end
        res.render('users/login.ejs', {error: "Invalid email/password"})
    } else {
        console.log('logging in the user')
        // encrypt the user id via AES (adv encrpyt standard)
        const encryptedUserId = cryptojs.AES.encrypt(user.id.toString(), process.env.SECRET)
        const encryptedUserIdString = encryptedUserId.toString()
        console.log(encryptedUserIdString)
        // store the encrypted ID in the cookie of the response object
        // key value pair for cookie.object
        res.cookie('userId', encryptedUserIdString)
        // redirect back to the home page
        res.redirect('/')
    }
})

router.get('/logout', (req, res)=>{
    console.log('logging out')
    res.clearCookie('userId')
    res.redirect('/')
})

// export all these routes to the entry point file
module.exports = router