import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    defaultViewport: {
        width: 1920, height: 1080
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    //args: [ '--proxy-server=http://80.244.229.102:10000' ]
})

const page = await browser.newPage()
const getTaxiRegByPlate = async plate => {
    await page.goto(`https://mtdi.mosreg.ru/deyatelnost/celevye-programmy/taksi1/proverka-razresheniya-na-rabotu-taksi?number=${plate}&name=&id=&region=ALL`,
        {waitUntil: 'domcontentloaded'}
    )
    await page.waitForNetworkIdle()
    const scriptText = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).find(el => el.outerHTML.includes('new Vue')).outerHTML
    })

    const extractedText = scriptText.split('result: ')[1].split('error:')[0].trim().slice(0, -1)
    const json = JSON.parse(extractedText)

    return json
}

// let carInfo = await getTaxiRegByPlate('О189ХУ750')
// console.log(carInfo)
// carInfo = await getTaxiRegByPlate('К673ХУ750')
// console.log(carInfo)

export {getTaxiRegByPlate}
