var Swal: any;

namespace UI {
  function updateSizing() {
    let height = (window.visualViewport.width * 0.176) + 170; // it works, don't mess it up
    (<HTMLDivElement>document.querySelector("div.banner")).style.height = `${height}px`;
    document.querySelectorAll("div.banner img").forEach((div) => {
      (<HTMLDivElement>div).style.height = `${height}px`;
      (<HTMLDivElement>div).style.left = `calc(50% - ${height * 2}px)`;
    });
  }

  window.onresize = updateSizing;
  window.onload = updateSizing;
}