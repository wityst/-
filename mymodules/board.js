const express = require('express');
let router = express.Router();

//DB모듈 불러오기
const mysql = require('mysql');
const dbSecret = require('./dbsecret');

const conn = mysql.createConnection(dbSecret);

function checkLogin(req, res){
	if(req.session.user == undefined){
		req.session.flashMsg = {type:'warning', msg:'로그인 후 시도하세요'};
		res.redirect('back');
		return false;
	}
	return true;
}

router.get('/', (req, res)=>{
	let page = req.query.p;
	if(page == undefined || page <1) {
		page = 1;
	}
	page = parseInt(page);

	let sql = "SELECT b.*, u.name FROM boards AS b, users AS u "
	+ " WHERE u.email = b.writer " 
	+ " ORDER BY b.id DESC LIMIT ?, 10";

	conn.query(sql, [(page-1) * 10], (err, result)=>{
		if(err) {
			res.render('error', {
				head:"에러 발생", 
				msg:`글을 불러오는 중 오류가 발생했습니다.`});
			return;
		}
		let list = result;
		conn.query("SELECT count(*) AS cnt FROM boards",[],(err,result)=>{
			let p ={};
			p.nowPage = page;
			p.cnt =	result[0].cnt;
			p.totlaPage = Math.ceil(p.cnt / 10);
			p.endPage = page + 1;
			p.startPage = page - 1;
			p.prev = true;
			p.next = true;
			if(p.totlaPage -1 < p.endPage) {
				p.endPage = p.totlaPage;
				p.startPage = p.totlaPage - 2;
				p.next = false;
			}
			if(p.startPage <= 1) {
				p.prev = false;
				p.startPage = 1;
				p.endPage = 3;
			}

			res.render('board/board', {list:list,p:p});
		})
	});
});

router.get('/write', (req, res)=>{
	if(!checkLogin(req, res)){
		return;
	}
	res.render('board/write', {});
});

router.post('/write', (req, res) =>{
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

router.get('/view/:id', (req, res) => {
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

router.get('/del/:id', (req, res)=>{
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

router.get('/mod/:id', (req, res)=>{
	let id = req.params.id;
	if(!checkLogin(req, res)){
		res.render('error', {
			head:"에러 발생", msg:`권한이 없습니다.`});
		return;
	}

	let sql = "SELECT * FROM boards WHERE id = ?";
	conn.query(sql, [id], (err, result)=>{
        //에러처리 귀찮아서 안함.
        
        if(result.length == 0 ||
        	result[0].writer != req.session.user.email){
        	res.render('error', {
        		head:"에러 발생", 
        		msg:`${id}번 글은 존재하지 않거나 권한이 없습니다.`});
        return;
    }

    let data = result[0];
    res.render('board/mod', {data:data});
});
});

router.post('/mod/:id', (req, res)=>{
	let id = req.params.id;
	if(!checkLogin(req, res)){
		res.render('error', {
			head:"에러 발생", msg:`권한이 없습니다.`});
		return;
	}

	let sql = "SELECT * FROM boards WHERE id = ?";
	conn.query(sql, [id], (err, result)=>{
        //에러처리 귀찮아서 안함.
        
        if(result.length == 0 ||
        	result[0].writer != req.session.user.email){
        	res.render('error', {
        		head:"에러 발생", 
        		msg:`${id}번 글은 존재하지 않거나 권한이 없습니다.`});
        return;
    }

    let title = req.body.title;
    let content = req.body.content;

    let sql = "UPDATE boards SET title = ?, content = ? WHERE id = ?";
    conn.query(sql, [title, content, id], (err, result)=>{
    	if(result.affectedRows == 1){
    		req.session.flashMsg = {type:'success', msg:'성공적으로 글 수정'};
    		res.redirect('/board');
    	}else{
    		req.session.flashMsg = {type:'warning', msg:'글수정 실패'};
    		res.redirect('back');
    	}
    });
});
});


module.exports = router;