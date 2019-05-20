window.addEventListener("load", ()=>{
    let btnBackList = document.querySelectorAll("button.prev");

    btnBackList.forEach(btn => {
        btn.addEventListener("click", (e)=>{
            history.back();
        });
    });
});