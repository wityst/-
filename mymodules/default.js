const express = require('express');
let router = express.Router();

//DB모듈 불러오기
const mysql = require('mysql');
const dbSecret = require('./dbsecret');
const lunch = require("../lunch");

const conn = mysql.createConnection(dbSecret);

function checkLogin(req, res){
    if(req.session.user == undefined){
        req.session.flashMsg = {type:'warning', msg:'로그인 후 시도하세요'};
        res.redirect('back');
        return false;
    }
    return true;
}

router.get('/', function(req, res){
    res.render('main', {title : "Welcome to Express!"});
});

router.get('/lunch', function(req, res) {
    res.render('lunchview');
});

router.post('/lunch', function(req, res){
    let date = req.body.date;  // 2019-05-14
    date = date.split("-").join("");
    lunch(date, function(menu){
        res.render('lunchresult', {data:menu, date:req.body.date});
    });
});

router.get('/register', function(req, res){
    res.render('registerpage');
});

router.post('/register', function(req, res) {
    let data = req.body;
    if(data.email == "" || data.password == "" || data.username == ""){
        req.session.flashMsg 
            = {type:'danger', msg:'필수값이 누락되었습니다.'};
        res.redirect("/register");
        return;
    }

    if(data.password != data.passcheck){
        req.session.flashMsg 
            = {type:'danger', msg:'비밀번호와 확인이 일치하지 않습니다.'};
        res.redirect("/register");
        return;
    }


    let sql = "INSERT INTO users (`email`, `password`, `name`, `level`) " +
             " VALUES (?, PASSWORD(?), ?, 1)";
    conn.query(sql,[data.email, data.password, data.username], (error, result)=>{
        if(error){
            if(error.errno == 1062){
                res.render('error', {
                    head:"에러 발생", 
                    msg:`중복된 아이디입니다 : ${error.sqlMessage}`});
            }else{
                res.render('error', {
                    head:"에러 발생", 
                    msg:`DB 입력중 오류 발생 : ${error.sqlMessage}`});
            }           
            
            return;
        }
        req.session.flashMsg 
            = {type:'success', msg:'회원가입이 성공적으로 이루어졌습니다.'};
        res.redirect("/");
    });
});

router.get('/login', (req, res)=>{
    res.render('login');
});

router.post('/login', (req, res)=>{
    let email = req.body.email;
    let pass = req.body.password;

    //console.log(email, pass);
    let sql = "SELECT * FROM users WHERE email = ? AND password = PASSWORD(?)";
    conn.query(sql, [email, pass], (err, result)=>{
        if(err){
            req.session.flashMsg = {type:'danger', msg:'DB오류'};
            res.redirect("/login");
            return;
        }

        if(result.length == 1){
            //로그인 성공
            req.session.user = result[0];
            req.session.flashMsg = {type:'success', msg:'로그인 되었습니다.'};

            res.redirect('/');
        }else{
            //로그인 실패
            req.session.flashMsg = {type:'warning', msg:'아이디와 비밀번호가 일치하지 않습니다.'};
            res.redirect('back');
        }
    });
});

router.get('/logout', (req, res)=>{
    if(!checkLogin(req, res)){
        return;
    }
    delete req.session.user;
    req.session.flashMsg = {'type':'success', msg:'로그아웃되었습니다.'};
    res.redirect('/');
});


module.exports = router;