const express = require('express');
const app = express();
const ejsLint = require('ejs-lint');
const partials = require('express-partials');
const request = require('request');
const bodyparser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport'),
localstrategy = require('passport-local');
const crypto = require("crypto");
const user = require("./models/user");
const methodoverride = require('method-override');
const tests = require("./models/test");
const userdata = require("./models/testdone")
const nodemailer = require("nodemailer");
const async = require('async')
const middleware = require("./middleware");
const dotenv = require('dotenv');
dotenv.config();
//Connect to Database
mongoose.connect("mongodb+srv://docproject:abcd123@docproject.72nu7uj.mongodb.net/?retryWrites=true&w=majority",{useNewUrlParser: true, useUnifiedTopology: true}, (err)=> {
  if(err) return console.error(err);
  console.log('Connected to MongoDB');
})

app.use(bodyparser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(partials());
app.use(express.static(__dirname + "/public"));
app.use(methodoverride("_method"));
const flash = require('connect-flash');
const testdone = require('./models/testdone');
app.use(express.json())
app.use(flash());

app.locals.moment = require('moment');
//passport config
app.use(require('express-session')({
  secret: "This is to modify the password",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
app.use((req, res, next)=>{
  res.locals.currentuser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

app.get("/",(req,res)=>{
	res.render("landing");
});

app.get("/home", (req, res)=>{
    tests.find({}, (err,alltests)=>{
        if(err){
          console.log(err);
        }else{
        res.render("testing/index", {tests:alltests, page: 'testing'});
        }
    });
})

app.get('/register', (req, res)=>{
    res.render("users/register");
})

app.get('/login', (req, res)=>{
    res.render("users/login");
})

app.post("/register",(req,res)=>{
  let newuser = new user(
    {username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      avatar: req.body.avatar,
      description:req.body.description,
    });
  if(req.body.admincode === "secretcode123"){
    newuser.isadmin = true;
  }
  user.register(newuser, req.body.password, (err,user)=>{
    if(err){
      req.flash("error", err.message);
      return res.redirect("/register");
    }
    passport.authenticate("local")(req, res, ()=>{
      req.flash("success", "Successfully Signed Up! Nice to meet you "+ user.username);
      res.redirect("/home");
    });
  })
});

app.post("/login", passport.authenticate("local",{
  successRedirect: "/home",
  failureRedirect: "/login",
  failureFlash: true
}),(req,res)=>{
  req.flash('error', "Invalid Username or Password ");
});

app.get("/logout", (req,res)=>{
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash("success", "Logged you out!!!");
    res.redirect("/home");
  });
});


app.get("/users/:id", middleware.isLoggedIn, (req,res)=>{
  user.findById(req.params.id, (err, founduser)=>{
    if(err){
      req.flash("error", "user doesnot exists");
      res.redirect("back");
    }else{
      console.log(founduser.email)
      userdata.find({email:founduser.email}, (err, data)=>{
        if(err) {
          req.flash("error", "user doesnot exists");
          res.redirect("back");
        }
        else {
          console.log(founduser.isadmin);
          res.render("users/show",{user: founduser, userdata: data, admin: founduser.isadmin});
        }
      })
    };
    }
  );
});


app.post('/addTestReview', middleware.isLoggedIn ,async (req, res)=>{
  let id  = req.body.test;
  tests.findById(id, (err, data)=>{
    if(err){
      req.flash("error", "There is a Problem, Please Try Again..");
      res.redirect("back");
    }
    else {
      console.log(req.user)
      res.render("bookReview", {data: data, user: req.user});
    }
  })
})

app.get('/booktest', middleware.isLoggedIn ,(req, res)=>{
  tests.find({}, (err, data)=>{
    if(err) {
      req.flash("error", "There is a Problem, Please Try Again..");
      res.redirect("back");
    }
    else {
      res.render("booktest",{tests: data});
    }
  })
})

app.post("/addfinaltest", middleware.isLoggedIn, (req, res)=>{
  var finalprice = req.body.finalprice;
  console.log(req.body)
  console.log(finalprice)
  console.log(req.body.test)
  finalprice = Number(finalprice)
  let newtestdone = new testdone({
    name : req.body.test,
    email : req.user.email,
    price : finalprice,
    bookedDate: new Date()
  });
  testdone.create(newtestdone, (err, newly)=>{
    if(err) {
      req.flash("error", "There is a problem , please try again..");
      res.redirect("/home")
    }
    else {
      req.flash("success", "Test Booked Succesfully...")
      res.redirect("/home");
    }
  })
})

//password reset
app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      user.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'apartmentsystem130@gmail.com',
          pass: 'SE7375107'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'apartmentsystem130@gmail.com',
        subject: 'Testing LAB Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        res.redirect("/forgot");
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'apartmentsystem130@gmail.com',
          pass: 'SE7375107'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'apartmentsystem130@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect("home");
  });
});

app.get("/addtest", middleware.isLoggedIn, (req,res)=>{
  res.render("addtest");
})

app.post("/addedtest", (req, res)=>{
  test = new tests({
    name: req.body.name,
    image: req.body.image,
    price: req.body.price,
    discount: req.body.discount,
    description: req.body.description
  })
  tests.create(test, (err, newly) =>{
    if(err) {
      req.flash("error", "Unable to Add new test..!")
      res.redirect("home")
    }
    else {
      req.flash("success", "new Test Added Successfully...!")
      res.redirect("home")
    }
  })
})

PORT = process.env.PORT || 8080
app.get("/contact",(req,res)=>{
	res.render("contact");
});
app.get("/about",(req,res)=>{
	res.render("about");
});

app.get("/deletetest", (req, res)=>{
  tests.find({}, (err,alltests)=>{
    if(err){
      console.log(err);
    }else{
    res.render("deletetest", {tests:alltests});
    }
  });
})

app.post("/deletedtest", (req, res)=>{
  const id = req.body.idtest;
  tests.deleteOne({_id: id}, (err, alltests)=>{
    if(err) {
      req.flash("error", "Cannot delete the Test..!");
      res.redirect("home");
    }
    else {
      req.flash("success", "Test Deleted Successfully...!");
      res.redirect("home");
    }
  })
})

app.get('/updatetest', middleware.isLoggedIn, (req, res)=>{
  tests.find({}, (err,alltests)=>{
    if(err){
      console.log(err);
    }else{
    res.render("updatetest", {tests:alltests});
    }
  });
})

app.post('/updatedtest', middleware.isLoggedIn, (req, res)=>{
  var {idtest, name, price, discount, description} = req.body;
  tests.findById(idtest, (err, newly) =>{
    if (err) {
      req.flash("error", "Cannot delete the Test..!");
      res.redirect("home");
    }
    else {
      if(name == "") {
        name = newly.name;
      }
      if (price == "") {
        price = newly.price;
      }
      if (discount == "") {
        discount = newly.discount;
      }
      if (description == "") {
        description = newly.description;
      }
      if (discount > 100 || discount < 0) {
        req.flash("error", "Discount Range : 0 <= Discount <= 100");
        res.redirect("back");
      }
    }

    tests.findByIdAndUpdate(idtest, {name: name, price: price, discount: discount, description: description}, (err, newly)=>{
      if(err) {
        req.flash("error", "Cannot delete the Test..!");
        res.redirect("home");
      }
      else {
        req.flash("success", "Updated Successfully" + name);
        res.redirect("home");
      }
    })
  })  
})

app.listen(PORT, ()=>console.log(`The server is started at PORT : ${PORT}`));