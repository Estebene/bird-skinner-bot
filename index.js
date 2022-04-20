const puppeteer = require('puppeteer');
const fs = require('fs');
var Multiprogress = require('multi-progress');
 
// spawn an instance with the optional stream to write to
var multi = new Multiprogress(process.stderr);
var bars = [];
// create a progress bar



(async () => {
    let launchOptions = { headless: false, args: ['--start-maximized'] };
    let browser = await puppeteer.launch(launchOptions);
    let codes = ['UZJC', 'WPPB']
    codes.forEach((code, f) => {
        launchWebsite(code, f * 6000, browser).then(async (wordSet) => {
            let fileSet = (new Set(await readFile()))
            let newWordSet = new Set([...wordSet, ...fileSet])
            console.log(`\nWords Found: ${wordSet.size}`)
            console.log(`New Words Added: ${newWordSet.size - fileSet.size}`)
            writeFile(newWordSet)
        })
    })
})()

function readFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('words.txt', 'utf8' , (err, data) => {
            resolve(data.split("\n"))
        })
    })
}

function writeFile(wordSet) {
    let content = Array.from(wordSet).join('\n');
    fs.writeFile('words.txt', content, err => {
        if (err) {
            console.error(err)
            return
        }
    })
}
async function launchWebsite(code, offset, browser) {

    let words = new Set()
    const page = await browser.newPage()
    await page.setViewport({width: 1366, height: 768});
    await page.setUserAgent(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108.${offset} Safari/537.36`);

    await page.goto(`https://jklm.fun/${code}`);
    await page.waitForTimeout(500);
    await page.waitForTimeout(offset);
    await clickButton(page, 'OK')
    await page.waitForTimeout(6000);
    const iterations = 50
    const index = bars.length
    bars.push(multi.newBar('[:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 30,
        total: iterations,
    }));
    let lastMessage = 0;
    let letters = ['a', 'b', 'c', 'd']
    for( let d=iterations; d--; ) {  
        for( let i=2; i--; ) {  
            let newWords
            [lastMessage, newWords] = await getWords(page, letters[i],lastMessage)
            newWords.forEach(word => words.add(word))
            await page.waitForTimeout(600);
        }
        bars[index].tick()
    }
    return words
}

async function getWords(page, prompt ,lastMessage){
    sendText(page, `.c ${prompt}`)
    let message
    let counter = 0
    while (!message) {
        await page.waitForSelector('div.log.darkScrollbar')
        let messages = await page.$$("div.log.darkScrollbar")
        let value = await messages[0].$$eval('div', i=>i.map(a=>a.textContent)) 
        if (value.length > lastMessage) {
            if (value[value.length - 1].includes("👑BirdBot:") && value[value.length - 1].includes("result(s):")){
                message = value[value.length - 1]
                lastMessage = value.length
            }
        }
        counter++;
        if (counter > 100) {
            counter = 0;
            sendText(page, `.c ${prompt}`)
        }
        await page.waitForTimeout(5);
    }
    return [lastMessage, message.split(":")[3].split("(")[0].trim().split(", ")]
}

async function sendText(page, text) {
    await page.waitForSelector('div.input')
    await (await page.$$('div.input'))[0].$eval('textarea', (el, em) => el.value = em, text);
    await page.waitForTimeout(50);
    await page.keyboard.press('Enter');
}

async function clickButton(page, text, index = 0, isLink = false) {
    const button = await page.$x(`//${isLink ? "a" : "button"}[contains(., '${text}')]`);
    if (button[index]) {
        await page.evaluate((btn) => {
            btn.click();
        }, button[index]);
    }
}