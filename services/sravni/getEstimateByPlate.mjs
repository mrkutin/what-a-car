import fs from 'fs'

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import AnonymizePlugin from 'puppeteer-extra-plugin-anonymize-ua'

puppeteer.use(AnonymizePlugin())

import SessionPlugin from 'puppeteer-extra-plugin-session'

puppeteer.use(SessionPlugin.default())

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

    let cookies = []
    if (fs.existsSync('./cookies.txt')) {
        const file = fs.readFileSync('./cookies.txt', {encoding: 'utf8'})
        cookies = JSON.parse(file)
    }

    if(!cookies || !cookies.length){
        cookies = [
            {name: '.ASPXANONYMOUS', value: 'fQfp - _d9_0uYc - q4c41WdQ', domain: '.sravni.ru'},
            {name: '_SL_', value: '6.83.', domain: '.sravni.ru'},
            {
                name: 'prc_osago',
                value: 'us=eaisto.me_3718&um=cpa&uc=osago_link&p_offer_id=1064&aff_id=1425&source=3718&tid=1022c4bf5f4fe2733137b2444939e9&targeted=True',
                domain: '.sravni.ru'
            },
            {name: 'AB_CREDITSELECTION', value: 'Test_000200_B', domain: '.sravni.ru'},
            {name: 'AB_CREDITSELECTION_DIRECT', value: 'always', domain: '.sravni.ru'},
            {name: '_ym_uid', value: '1673854285877341971', domain: '.sravni.ru'},
            {name: '_ym_d', value: '1673854285', domain: '.sravni.ru'},
            {name: 'tmr_lvid', value: 'b670ec5f3b85ebb0046f24a46ad14348', domain: '.sravni.ru'},
            {name: 'tmr_lvidTS', value: '1673854286380', domain: '.sravni.ru'},
            {
                name: '__utmz',
                value: 'utmccn=(not set)|utmcct=(not set)|utmcmd=referral|utmcsr=eaisto.me|utmctr=(not set)',
                domain: '.sravni.ru'
            },
            {name: '_ipl', value: '6.83.', domain: '.sravni.ru'},
            {
                name: '_cfuvid',
                value: 'WOolfGxNAZJrKCJu4Q_n9t4chTnACB1UFZsbGwqrj_g-1675179275084-0-604800000',
                domain: '.sravni.ru'
            },
            {name: '_ym_isad', value: '2', domain: '.sravni.ru'},
            {name: '_gid', value: 'GA1.2.1002347441.1675179277', domain: '.sravni.ru'},
            {
                name: '__utmx',
                value: 'utmccn=(not set)|utmcct=(not set)|utmcmd=(none)|utmcsr=(direct)|utmctr=(not set)',
                domain: '.sravni.ru'
            },
            {
                name: '__cf_bm',
                value: 'Wra5AbhJa533J0EKVk8EozGfcLxa1LXZSKbs.Ip3dqE-1675184873-0-AfLV8MeZqv0R/aDe02vjo2Xzw553LibaVqCUUTsL2CnQHKAG+21TRPtcUSVgCSiiMjpQbomahptNmyr+wCxmSMgpvhGELYA8wxInQgCZFpkl5HqaM3BLTbwPnXT2+bNnidSxDBT1paAdjGTxntED0tqev/4DnFdCcNpkr4aMg1PhWY7T7GpemQe1MhnkpI9Di1Pv0UH0bq2mqt5Ou/XbOs4=',
                domain: '.sravni.ru'
            },
            {name: '_gat_UA-8755402-16', value: '1', domain: '.sravni.ru'},
            {name: '_dc_gtm_UA-8755402-14', value: '1', domain: '.sravni.ru'},
            {name: 'tmr_detect', value: '0|1675184878054', domain: 'www.sravni.ru'},
            {name: '_ga', value: 'GA1.2.1344144150.1673854286', domain: '.sravni.ru'},
            {name: '_ga_WE262B3KPE', value: 'GS1.1.1675179276.12.1.1675184883.47.0.0', domain: '.sravni.ru'},
        ]
    }
    await page.setCookie(...cookies)

    await page.goto('https://www.sravni.ru/osago/')
    await page.waitForNavigation()

    await page.focus('#carNumber')
    await page.keyboard.type(plate)

    const responsePromise = new Promise((resolve, reject) => {
        page.on('response', async (response) => {
            if (response.request().url().includes('/api/autoInfo')) {
                const json = await response.json()
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

        const cookies = await page.cookies()
        fs.writeFileSync('./cookies.txt', JSON.stringify(cookies, null, 2), {encoding: 'utf8'})

        await browser.close()
        return sravni
    } catch (e) {
        await browser.close()
        console.log(e)
        return null
    }
}

//const insurance = await getEstimateByPlate('А777МР77 ')
const insurance = await getEstimateByPlate('р673хк750 ')
console.log(insurance)

export {getEstimateByPlate}