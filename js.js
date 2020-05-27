//Adds smooth scroll and cleans the URl after clicking on a link that points to a div
let links = document.getElementsByTagName("a");
Array.prototype.forEach.call(links, function(elem, index) {
    let elemAttr = elem.getAttribute("href");
    if (elemAttr && elemAttr.includes("#")) {
        elem.addEventListener("click", function(ev) {
            ev.preventDefault();
            document.getElementById(elemAttr.replace(/#/g, "")).scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest"
            });
        });
    }
});