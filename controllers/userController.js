const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
}

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register', body: {} });
}

exports.validateRegister = (req, res, next) => {
    req.sanitizeBody('name');
    req.checkBody('name', 'Please supply a name').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: false
    });

    req.checkBody('password', 'Please supply a password').notEmpty();
    req.checkBody('password-confirm', 'Please supply a confirmed password').notEmpty();
    req.checkBody('password-confirm', 'Your passwords do not match').equals(req.body.password);

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    }
    next();
}

exports.register = async (req, res, next) => {
    const user = new User({ name: req.body.name, email: req.body.email });
    const registerWithPromise = promisify(User.register, User);
    await registerWithPromise(user, req.body.password);
    next();
}

exports.account = (req, res) => {
    res.render('account', { title: 'Edit Account' });
}

exports.updateAccount = async (req, res) => {
    const updates = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: updates },
        { new: true, runValidators: true, context: 'query '}
    );

    req.flash('success', 'Updated your profile');
    res.redirect('back');
}