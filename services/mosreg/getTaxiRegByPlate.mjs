const PROXY = process.env.PROXY || 'socks5://190.2.155.30:21551'//dynamic
const NAVIGATION_TIMEOUT_MS = 60000

import querystring from 'querystring'

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

const getTaxiRegByPlate = async plate => {
    console.log(`getTaxiRegByPlate plate: ${plate}, ${new Date()}`)

    const query = querystring.encode({
        number: plate,
        name: "",
        id: "",
        region: "ALL"
    })
    const url = `https://mtdi.mosreg.ru/deyatelnost/celevye-programmy/taksi1/proverka-razresheniya-na-rabotu-taksi?${query}`

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
        defaultViewport: {
            width: 1920, height: 1080
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
        // args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${PROXY}`]
    })
    const page = await browser.newPage()

    const responsePromise = new Promise((resolve, reject) => {
        page.on('response', async (response) => {
            const text = await response.text()
            if (response.status() === 200 && response.request().url() === url && text.includes('new Vue')) {
                //const text = await response.text()

                const scripts = new RegExp(/\<script\>(.*?)\<\/script\>/gms).exec(text)
                const vueScript = scripts.find(script => script.includes('new Vue'))

                const extractedText = vueScript.split('result: ')[1].split('error:')[0].trim().slice(0, -1)
                const json = JSON.parse(extractedText)

                resolve(json)
            }
        })
        setTimeout(() => {
            reject(new Error(`proverka-razresheniya-na-rabotu-taksi?number= waiting timeout for ${plate}`))
        }, NAVIGATION_TIMEOUT_MS)
    })
    await page.goto(url)

    const res = await responsePromise
    console.log(`getTaxiRegByPlate json: ${JSON.stringify(res, null, 2)}, ${new Date()}`)

    await browser.close()

    return res
}

// let carInfo = await getTaxiRegByPlate('О189ХУ750')
// console.log(carInfo)
// let carInfo = await getTaxiRegByPlate('Х470хр750')
// console.log(carInfo)

export {getTaxiRegByPlate}
