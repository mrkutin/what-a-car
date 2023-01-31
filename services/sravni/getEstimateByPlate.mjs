import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import AnonymizePlugin from 'puppeteer-extra-plugin-anonymize-ua'
puppeteer.use(AnonymizePlugin(
    {
        customFn: (ua) => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    }
))

// import SessionPlugin from 'puppeteer-extra-plugin-session'
// puppeteer.use(SessionPlugin.default())

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())


const getEstimateByPlate = async plate => {
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

    await page.goto('https://www.sravni.ru/osago/')
    await page.waitForNavigation()

    await page.focus('#carNumber')
    await page.keyboard.type(plate)

    const responsePromise = new Promise((resolve, reject) => {
        page.on('response', async(response) => {
            if (response.request().url().includes('/api/autoInfo')){
                const json = await response.json();
                resolve(json)
            }
        })
        setTimeout(() => {
            reject(new Error(`/api/autoInfo waiting timeout for ${plate}`))
        }, 20000)
    })

    await page.click('button[type="submit"]')

    try {
        const res = await responsePromise
        const {years, models, powers, ...sravni} = res
        await browser.close()
        return sravni
    } catch (e) {
        await browser.close()
        console.log(e)
        return null
    }
}

// const insurance = await getEstimateByPlate('а777мр77')
// console.log(insurance)

export {getEstimateByPlate}