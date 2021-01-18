var Swal;
var UI;
(function (UI) {
    function updateSizing() {
        var height = (window.visualViewport.width * 0.176) + 170; // it works, don't mess it up
        document.querySelector("div.banner").style.height = height + "px";
        document.querySelectorAll("div.banner img").forEach(function (div) {
            div.style.height = height + "px";
            div.style.left = "calc(50% - " + height * 2 + "px)";
        });
    }
    window.onresize = updateSizing;
    window.onload = updateSizing;
})(UI || (UI = {}));
