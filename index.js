const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');

//DB모듈 불러오기
const mysql = require('mysql');

const dbSecret = require('./mymodules/dbsecret');
const lunch = require("./lunch");

//세션 불러오기
const session = require('express-session');

const conn = mysql.createConnection(dbSecret);
conn.query("USE yy_20125");

//익스프레스 만들기
let app = express();

app.set('port', 12000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static( path.join(__dirname, 'public')) );
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    resave:false,  //요청 변경시에도 세션정보 저장 일반적으로 false
    saveUninitialized:false, // 초기화되지 않은 세션들도 저장할 것인가?
    secret:"gondr"   //사용자한테 보내지는 쿠키를 암호화할 때 쓸 키
}));

//플래시 메시지 처리 미들웨어 시작
app.use((req, res, next)=> {
    if(req.session.flashMsg != undefined){
        res.locals.flash = req.session.flashMsg;
        delete req.session.flashMsg;
    }
    next();
});
//플래시 메시지 처리 미들웨어 끝


app.get('/', function(req, res){
    res.render('main', {title : "Welcome to Express!"});
});

app.get('/lunch', function(req, res) {
    res.render('lunchview');
});

app.post('/lunch', function(req, res){
    let date = req.body.date;  // 2019-05-14
    date = date.split("-").join("");
    lunch(date, function(menu){
        res.render('lunchresult', {data:menu, date:req.body.date});
    });
});

app.get('/register', function(req, res){
    res.render('registerpage');
});

app.post('/register', function(req, res) {
    let data = req.body;
    if(data.email == "" || data.password == "" || data.username == ""){
        req.session.flashMsg 
            = {'type':'danger', msg:'필수값이 누락되었습니다.'};
        res.redirect("/register");
        return;
    }

    if(data.password != data.passcheck){
        req.session.flashMsg 
            = {'type':'danger', msg:'비밀번호와 확인이 일치하지 않습니다.'};
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
            = {'type':'success', msg:'회원가입이 성공적으로 이루어졌습니다.'};
        res.redirect("/");
    });
});

app.get('/login', (req, res)=>{
    res.render('login');
});

let server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log("Express 엔진 실행중!");
});

