namespace _wb_home {
  /** Scrolls smoothly to an anchor on the page and updates the URL without reloading. */
  export function scrollToAnchor(name: string) {
    document.querySelector(`a[name="${name}"]`).scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, null, `#${name}`);
  }

  /** Shows the privacy policy. */
  export function privacy() {
    Swal.fire({
      icon: "info",
      width: 800,
      title: "Our Privacy Policy",
      html: `Here at Writeboard, we're committed to your privacy, which is why this privacy policy aims to be as transparent as possible.
    All the data we collect is for the sole purpose of improving Writeboard, and we never share any data with any third parties.
    <h2>What data do we collect?</h2>
      <ul>
        <li>Device information such as OS, model, input type etc</li>
        <li>Browser information such as name, version, screen resolution etc</li>
        <li>Country</li>
      </ul>
    <h2>What data don't we collect?</h2>
    <ul>
      <li>Any personally-identifiable data</li>
      <li>IP addresses</li>
    </ul>`,
      confirmButtonText: "Close",
      background: "var(--background)"
    })
  }

  /**
   * Updates the "Latest Updates" section of the homepage.
   * This queries the GitHub API to get the latest commits.
   * These are then formatted and put into the HTML list.
   */
  export function updateLatestUpdates() {
    let updateList: HTMLUListElement = document.querySelector("ul#updateList");

    window.fetch("https://api.github.com/repos/w-henderson/Writeboard/commits")
      .then(data => {
        if (data.ok) return data.json();
        else {
          updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
          firebase.analytics().logEvent("latestUpdatesError", { "errorType": "404" });
          return false;
        }
      })
      .then(data => {
        if (!data) return;
        updateList.innerHTML = "";

        for (let commit of data) {
          let commitMessage: string = commit.commit.message;
          if (commitMessage.substr(0, 20) === "Merge pull request #") continue; // Ignore merge commits
          else commitMessage = commitMessage.split("\n")[0];

          let commitDate = new Date(commit.commit.author.date);
          let commitDateString = commitDate.toLocaleDateString() + ": ";

          let li = document.createElement("li");
          let a = document.createElement("a");
          let date = document.createTextNode(commitDateString);
          a.href = commit.html_url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = commitMessage;
          li.appendChild(date);
          li.appendChild(a);
          updateList.appendChild(li);

          if (updateList.childElementCount === 5) return;
        }
      })
      .catch((e) => {
        updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
        firebase.analytics().logEvent("latestUpdatesError", { errorType: "unknown" });
      });
  }

  /** Fixes CSS `vh` unit scaling on mobile, especially Android. */
  export function fixMobileScaling() {
    let hero: HTMLElement = document.querySelector("section.hero");
    if (window.innerWidth > 1100) hero.style.height = `${window.innerHeight - 120}px`;
    else hero.style.height = `${window.innerHeight - 220}px`;
  }
}

window.addEventListener("load", _wb_home.updateLatestUpdates);
window.addEventListener("resize", _wb_home.fixMobileScaling);
_wb_home.fixMobileScaling();