const PROXY = process.env.PROXY || 'socks5://190.2.155.30:21551'
const NAVIGATION_TIMEOUT_MS = 60000

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

import AnonymizePlugin from 'puppeteer-extra-plugin-anonymize-ua'

puppeteer.use(AnonymizePlugin())

import headers from './headers.mjs'

const getInsuranceByPlate = async (plate) => {
    console.log(`getInsuranceByPlate plate: ${plate}, ${new Date()}`)

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
        defaultViewport: {
            width: 1920, height: 1080
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${PROXY}`]
    })

    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)

    await page.goto('https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfo.htm', {waitUntil: 'domcontentloaded'})

    await page.waitForSelector('#tsBlockTab', {timeout: 5000})
    await page.click('#tsBlockTab')

    await page.focus('#licensePlate')
    await page.keyboard.type(plate)

    await page.click('#buttonFind')
    await page.waitForNavigation()

    const texts = await page.evaluate(() => Array.from(document.querySelectorAll('tr.data-row > td')).map(el => el.innerText))

    const flattenedTexts = texts.map(el => el.split('\n').map(el => {
        const split = el.split('\t')
        return split[1] || split[0]
    })).flat(2)

    if (!flattenedTexts.length)
        return null

    //to remove duplicate vins
    if ((flattenedTexts[7] === flattenedTexts[8]) || (flattenedTexts[7] === 'Сведения отсутствуют')) {
        flattenedTexts.splice(7, 1)
    }

    const autoins = flattenedTexts.reduce((acc, text, idx) => {
        acc[headers[idx]] = text
        return acc
    }, {})

    await browser.close()

    console.log(`getInsuranceByPlate autoins: ${JSON.stringify(autoins, null, 2)}, ${new Date()}`)

    return autoins
}

// const insurance = await getInsuranceByPlate('Е552МВ790')
// console.log(insurance)

export {getInsuranceByPlate}