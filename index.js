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

function checkLogin(req, res){
    if(req.session.user == undefined){
        req.session.flashMsg = {type:'warning', msg:'로그인 후 시도하세요'};
        res.redirect('back');
        return false;
    }
    return true;
}

//플래시 메시지 처리 미들웨어 시작
app.use((req, res, next)=> {
    if(req.session.flashMsg != undefined){
        res.locals.flash = req.session.flashMsg;
        delete req.session.flashMsg;
    }

    if(req.session.user != undefined){
        res.locals.user = req.session.user;
    }

    //console.log(req.path);
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

app.get('/login', (req, res)=>{
    res.render('login');
});

app.post('/login', (req, res)=>{
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

app.get('/logout', (req, res)=>{
    if(!checkLogin(req, res)){
        return;
    }
    delete req.session.user;
    req.session.flashMsg = {'type':'success', msg:'로그아웃되었습니다.'};
    res.redirect('/');
});

app.get('/board', (req, res)=>{
    //페이징 나중에 처리할 것
    
    let sql = "SELECT b.*, u.name FROM boards AS b, users AS u "
            + " WHERE u.email = b.writer " 
            + " ORDER BY b.id DESC LIMIT 0, 10";

    conn.query(sql, [], (err, result)=>{
        if(err) {
            res.render('error', {
                head:"에러 발생", 
                msg:`글을 불러오는 중 오류가 발생했습니다.`});
            return;
        }
        res.render('board/board', {list:result});
    });
});

app.get('/board/write', (req, res)=>{
    if(!checkLogin(req, res)){
        return;
    }
    res.render('board/write', {});
});

app.post('/board/write', (req, res) =>{
    if(!checkLogin(req, res)){
        return;
    }

    let writer = req.session.user.email;
    let title = req.body.title;
    let content = req.body.content;

    if(title == "" || content == ""){
        req.session.flashMsg = {type:'warning', msg:'값에 공백이 있습니다. 모든 값을 채워주세요'};
        res.redirect('back');
        return;
    }

    let sql = "INSERT INTO boards (title, writer, content) VALUES (?, ?, ?)";
    conn.query(sql, [title, writer, content], (err, result)=>{
        if(err){
            req.session.flashMsg = {type:'danger', msg:'데이터베이스 오류 발생'};            
            res.redirect('back');
            return;
        }
        if(result.affectedRows == 1){
            req.session.flashMsg = {type:'success', msg:'성공적으로 글 작성'};
            res.redirect('/board');
        }else{
            req.session.flashMsg = {type:'warning', msg:'글작성 실패'};
            res.redirect('back');
        }
    });
});

app.get('/board/view/:id', (req, res) => {
    let id = req.params.id;

    let sql = "SELECT b.*, u.name FROM boards AS b, users AS u "
            + " WHERE id = ? AND u.email = b.writer";
    conn.query(sql, [id], (err, result)=>{
        if(err){
            res.render('error', {
                head:"에러 발생", 
                msg:`${id}번 글은 존재하지 않습니다.`});
            return;
        }
        let data = result[0];
        data.content = data.content.replace(/\n/g, "<br>");
        res.render('board/view', {data:data});
    });
});

app.get('/board/del/:id', (req, res)=>{
    let id = req.params.id;
    if(!checkLogin(req, res)){
        res.render('error', {
            head:"에러 발생", 
            msg:`권한이 없습니다.`});
        return;
    }
    let sql = "SELECT * FROM boards WHERE id = ?";
    conn.query(sql, [id], (err, result)=>{
        if(err || result.length == 0 
            || result[0].writer != req.session.user.email){
            res.render('error', {
                head:"에러 발생", 
                msg:`글이 존재하지 않거나 권한이 없습니다.`});
            return;
        }

        let sql = "DELETE FROM boards WHERE id = ?";
        conn.query(sql, [id], (err, result)=>{
            //에러처리 귀찮아서 안함.
            req.session.flashMsg 
                = {type:'success', msg:'성공적으로 삭제'};
            res.redirect('/board');
        });
    });
});

app.all("*", (req, res)=>{
    res.render('error', {
        head:"에러 발생", 
        msg:`존재하지 않는 페이지입니다.`});
    return;
});

let server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log("Express 엔진 실행중!");
});

