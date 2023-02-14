const PROXY = process.env.PROXY || 'socks5://190.2.155.30:21551'//dynamic

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
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${PROXY}`]
})

const page = await browser.newPage()
const getTaxiRegByPlate = async plate => {
    console.log(`getTaxiRegByPlate plate: ${plate}, ${new Date()}`)

    await page.goto(`https://mtdi.mosreg.ru/deyatelnost/celevye-programmy/taksi1/proverka-razresheniya-na-rabotu-taksi?number=${plate}&name=&id=&region=ALL`,
        {waitUntil: 'domcontentloaded'}
    )
    await page.waitForNetworkIdle()
    const scriptText = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'))
        const vueScript = scripts.find(el => el.outerHTML.includes('new Vue'))
        return vueScript?.outerHTML || null
    })

    if(!scriptText){
        return null
    }

    const extractedText = scriptText.split('result: ')[1].split('error:')[0].trim().slice(0, -1)
    const json = JSON.parse(extractedText)

    console.log(`getTaxiRegByPlate json: ${JSON.stringify(json, null, 2)}, ${new Date()}`)

    return json
}

// let carInfo = await getTaxiRegByPlate('О189ХУ750')
// console.log(carInfo)
// carInfo = await getTaxiRegByPlate('К673ХУ750')
// console.log(carInfo)

export {getTaxiRegByPlate}
