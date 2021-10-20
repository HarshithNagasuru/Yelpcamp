if(process.env.NODE_ENV !=="production"){
    require('dotenv').config();
}
console.log(process.env.SECRET)

const express=require('express');
const app=express();
const path=require('path');
const mongoose=require('mongoose');
const sesssion=require('express-session');
const ejsMate=require('ejs-mate');
const Joi=require('joi');
const methodOverride=require('method-override');
const flash=require('connect-flash');
const session = require('express-session');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const mongoSanitize = require('express-mongo-sanitize');
const MongoStore = require('connect-mongo');

const Campground=require('./models/campground');
const catchAsync=require('./utils/catchAsync');
const ExpressError=require('./utils/ExpressError');
const {campgroundSchema,reviewSchema}=require('./schemas');
const Review=require('./models/review');
const User=require('./models/user');
const campgroundRoutes=require('./routes/campgrounds')
const reviewRoutes=require('./routes/reviews');
const userRoutes=require('./routes/users')
const dbUrl=process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

//'mongodb://localhost:27017/yelp-camp'
mongoose.connect(dbUrl);

const db=mongoose.connection;
db.on('error',console.error.bind(console,"connection error:"));
db.once('open',()=>{
    console.log("Database Connected");
})

app.engine('ejs',ejsMate);

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname,'public')));
app.use(
    mongoSanitize({
      replaceWith: '_',
    }),
  );

  const secret=procees.env.SECRET || 'thisshouldbebettersecret';

const store=MongoStore.create({
    mongoUrl:dbUrl,
    secret,
    ttl:24*60*60
})


const sessionConfig={
    store,
    name:'session',
    secret,
    resave:false,
    saveUninitialized:true,
    cookie:{
        httpOnly:true,
        expire:Date.now() + 1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
}

app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    console.log(req.query);
    res.locals.currentUser=req.user;
   res.locals.success=req.flash('success');
   res.locals.error=req.flash('error');
   next();
})

app.get('/fakeUser',async(req,res)=>{
    const user=new User({email:'harshith@gmail.com',username:'harshith'});
   const newUser=await User.register(user,'sidhu');
   res.send(newUser);
})

app.use('/campgrounds',campgroundRoutes)
app.use('/campgrounds/:id/reviews',reviewRoutes);
app.use('/',userRoutes);

app.get('/',(req,res)=>{
    res.render('home')
})



app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404));
})

app.use((err,req,res,next)=>{
    const {statusCode=500}=err;
    if(!err.message) err.message='Oh No,Something went wrong'
    res.status(statusCode).render('error',{err});
})

app.listen(3000,()=>{
    console.log('Serving on port 3000')
})