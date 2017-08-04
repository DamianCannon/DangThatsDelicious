const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
        return;
    }
    req.flash('error', 'You must be logged in');
    res.redirect('/login');
}

exports.forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        req.flash('error', 'No account with that email exists');
        return res.redirect('/login');
    }

    user.resePasswordToken = crypto.randomBytes(20).toString('hex');
    user.resePasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetURL = `http://${req.headers.host}/account/reset/${user.resePasswordToken}`;
    await mail.send({
        user,
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'
    });
    req.flash('success', 'You have been emailed a password reset link');

    res.redirect('/login');
}

exports.resetPassword = async (req, res) => {
    const user = await User.findOne({
        resePasswordToken: req.params.token,
        resePasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    res.render('reset', { title: 'Reset Password'} );
}

exports.confirmPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next();
        return;
    }

    req.flash('error', 'Passwords do not match');
    return res.redirect('back');
}

exports.updatePassword = async (req, res) => {
    const user = await User.findOne({
        resePasswordToken: req.params.token,
        resePasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resePasswordToken = undefined;
    user.resePasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);

    req.flash('success', 'Your password has been reset');
    res.redirect('/');
}
