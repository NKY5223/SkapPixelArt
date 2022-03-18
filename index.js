/**
 * @type {HTMLCanvasElement}
 */
const imageCanvas = document.getElementById("imageCanvas");
const imageCtx = imageCanvas.getContext("2d");
const imageEl = new Image();
imageEl.addEventListener("load", e => {
    try {
        imageCanvas.height = Math.min(imageEl.height, 500);
        imageCanvas.width = imageCanvas.height * imageEl.width / imageEl.height;
        imageCtx.drawImage(imageEl, 0, 0, imageCanvas.width, imageCanvas.height);
        uploadImageDiv.style.height = imageCanvas.height + 120 + "px";
        imageLoaded = true;
        updatePixelatedImage();
    } catch (err) {
        console.error(err);
    }
});

/** @type {HTMLInputElement} */
const imageInput = document.getElementById("imageInput");
/** @type {HTMLDivElement} */
const uploadImageDiv = document.getElementById("uploadImage");
let currentImage = null;
let imageLoaded = false;

/** @type {HTMLInputElement} */
const pixelSizeInput = document.getElementById("pixelSizeInput");
/** @type {HTMLInputElement} */
const blockSizeInput = document.getElementById("blockSizeInput");
/** @type {HTMLInputElement} */
const colorThresholdInput = document.getElementById("colorThresholdInput");
imageInput.addEventListener("input", e => {
    if (currentImage) URL.revokeObjectURL(currentImage);
    imageLoaded = false;

    const imageURL = URL.createObjectURL(imageInput.files[0]);
    currentImage = imageURL;

    imageEl.addEventListener("load", e => {
        try {
            imageCanvas.height = imageEl.height;
            imageCanvas.width = imageEl.width;
            let h = Math.min(imageEl.height, 500);
            imageCanvas.style.height = h + "px";
            imageCanvas.style.width = h * imageEl.width / imageEl.height;
            imageCtx.drawImage(imageEl, 0, 0, imageEl.width, imageEl.height);
            uploadImageDiv.style.height = h + 120 + "px";
            imageLoaded = true;
            updatePixelatedImage();
        } catch (err) {
            console.error(err);
        }
    });
    imageEl.src = imageURL;
});
/** @type {HTMLInputElement} */
const mapInput = document.getElementById("mapInput");
const mapInputLabel = document.getElementById("mapInputLabel");
/** @type {HTMLSelectElement} */
const areaInput = document.getElementById("areaInput");

/** @type {{ maps: { type: "block", position: [number, number], size: [number, number], layer: 0 | 1, collide: boolean, color: [number, number, number], opacity: number }[] }} */
let currentMap = null;
mapInput.addEventListener("input", e => {
    mapInputLabel.removeChild(mapInputLabel.firstChild);
    mapInputLabel.append(mapInput.files[0].name);
    mapInput.files[0].text().then(json => {
        try {
            currentMap = JSON.parse(json);
            while (areaInput.firstChild) areaInput.firstChild.remove();
            if (!(currentMap.maps && (currentMap.maps instanceof Array))) throw new Error("areas not found")
            areaInput.append(currentMap.maps.map());
        } catch (err) {
            console.error(err)
        }
    });
});

/**
 * @type {HTMLCanvasElement}
 */
const outputCanvas = document.getElementById("outputCanvas");
const outputCtx = outputCanvas.getContext("2d");
/** @type {[number, number, number, number][]} */
let pixelatedImage = null;
let pixelatedWidth = null;
let pixelatedHeight = null;
function updatePixelatedImage() {
    const data = imageCtx.getImageData(0, 0, imageEl.width, imageEl.height).data;
    pixelatedImage = [];
    pixelSizeInput.disabled = true;
    blockSizeInput.disabled = true;
    // colorThresholdInput.disabled = true;
    mapInput.disabled = true;


    const pixelSize = Number(pixelSizeInput.value);
    const blockSize = Number(blockSizeInput.value);

    for (let y = 0; y < imageEl.height; y += pixelSize, pixelatedHeight++) {
        for (let x = 0; x < imageEl.width; x += pixelSize, pixelatedWidth++) {
            let colorR = 0;
            let colorG = 0;
            let colorB = 0;
            let n = 0;
            for (let dy = 0, i = 4 * (y * imageEl.width + x); dy < pixelSize && dy + y < imageEl.height; dy++) {
                for (let dx = 0; dx < pixelSize && dx + x < imageEl.width; dx++, n++, i++) {
                    colorR += data[i++];
                    colorG += data[i++];
                    colorB += data[i++];
                }
            }
            colorR /= n;
            colorG /= n;
            colorB /= n;

            outputCtx.fillStyle = `rgb(${colorR}, ${colorG}, ${colorB})`;
            outputCtx.fillRect(x * blockSize / pixelSize, y * blockSize / pixelSize, blockSize, blockSize);

            pixelatedImage.push([colorR, colorG, colorB, 255]);
        }
    }
    pixelatedWidth = Math.ceil(imageEl.width / pixelSize);
    pixelatedHeight = Math.ceil(imageEl.height / pixelSize);

    outputCanvas.width = pixelatedWidth * blockSize;
    outputCanvas.height = pixelatedHeight * blockSize;

    for (let y = 0; y < pixelatedHeight; y++) {
        for (let x = 0; x < pixelatedWidth; x++) {
            outputCtx.fillStyle = `rgba(${pixelatedImage[y * pixelatedWidth + x].join()})`;
            outputCtx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        }
    }

    pixelSizeInput.disabled = false;
    blockSizeInput.disabled = false;
    // colorThresholdInput.disabled = false;
    mapInput.disabled = false;
}
pixelSizeInput.addEventListener("change", updatePixelatedImage);
blockSizeInput.addEventListener("change", updatePixelatedImage);
// colorThresholdInput.addEventListener("change", updatePixelatedImage);



// https://stackoverflow.com/questions/13586999/color-difference-similarity-between-two-values-with-js i have no fucking idea
/**
 * 
 * @param {[number, number, number]} rgbA 
 * @param {[number, number, number]} rgbB 
 * @returns {number}
 */
function deltaE(rgbA, rgbB) {
    let labA = rgb2lab(rgbA);
    let labB = rgb2lab(rgbB);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}
function rgb2lab(rgb) {
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}