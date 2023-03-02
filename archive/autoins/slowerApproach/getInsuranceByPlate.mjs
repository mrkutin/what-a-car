const PROXY = process.env.PROXY || 'socks5://190.2.155.30:21551'
const NAVIGATION_TIMEOUT_MS = 60000

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

import AnonymizePlugin from 'puppeteer-extra-plugin-anonymize-ua'

puppeteer.use(AnonymizePlugin())

import {headersVin, headersVinBody, headersVinBodyChassis} from './headers.mjs'

const split = (arr, size) => arr.reduce(
    (acc, e, i) => {
        i % size
            ? acc[acc.length - 1].push(e)
            : acc.push([e])
        return acc
    }, [])

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
    if (!texts || !texts.length)
        return []

    const res = []
    const chunks = split(texts, 15)
    for (const chunk of chunks){
        let headers
        if(chunk[5].includes('VIN') && chunk[5].includes('Номер кузова') && chunk[5].includes('Номер шасси')){
            headers = headersVinBodyChassis
        } else if (chunk[5].includes('VIN') && chunk[5].includes('Номер кузова')){
            headers = headersVinBody
        } else {
            headers = headersVin
        }

        const flattenedTexts = chunk.map(el => el.split('\n').map(el => {
            const split = el.split('\t')
            return split[1] || split[0]
        })).flat(2)

        const autoins = flattenedTexts.reduce((acc, text, idx) => {
            acc[headers[idx]] = text
            return acc
        }, {})

        res.push(autoins)
    }

    await browser.close()

    console.log(`getInsuranceByPlate res: ${JSON.stringify(res, null, 2)}, ${new Date()}`)

    return res
}

// const insurance = await getInsuranceByPlate('Т270СВ77')
// console.log(insurance)

// const insurance = await getInsuranceByPlate('О189ХУ750')
// console.log(insurance)

export {getInsuranceByPlate}