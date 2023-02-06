const URL = 'https://www.ingos.ru/auto/osago/calc?mode=calc'

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

const context = browser.defaultBrowserContext()
await context.overridePermissions(URL, ['geolocation'])

const page = await browser.newPage()
await page.goto(URL)

const getCarByPlate = async plate => {
    await page.waitForSelector('input', {timeout: 10000})
    await page.type('input', plate, {delay: 100})

    const responsePromise = new Promise((resolve, reject) => {
        page.on('response', async (response) => {
            if (response.request().url().includes('v1?number')) {
                const json = await response.json()
                resolve(json)
            }
        })
        setTimeout(() => {
            reject(new Error(`v1?number waiting timeout for ${plate}`))
        }, 20000)
    })

    await page.waitForSelector('button[type="submit"]', {timeout: 10000})
    await page.click('button[type="submit"]')

    const res = await responsePromise

    await page.$eval('input', el => el.value = '')
    return res
}

// let carInfo = await getCarByPlate('Х605КМ797')
// console.log(carInfo)
// carInfo = await getCarByPlate('К203РУ799')
// console.log(carInfo)

export {getCarByPlate}
