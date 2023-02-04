//const COOKIES_FILE = './cookies.json'

//import fs from 'fs'
import headers from './headers.mjs'

const getInsuranceByPlate = async (page, plate) => {
    try {
        await page.waitForSelector('#tsBlockTab', {timeout: 5000})
        await page.click('#tsBlockTab')

        await page.focus('#licensePlate')
        await page.keyboard.type(plate)

        await page.click('#buttonFind')

        await page.waitForNavigation()

        const texts = await page.evaluate(() => Array.from(document.querySelectorAll('tr.data-row > td')).map(el => el.innerText))

        await page.waitForSelector('#buttonBack')
        await page.click('#buttonBack')

        // const cookies = await page.cookies()
        // fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2), {encoding: 'utf8'})

        const flattenedTexts = texts.map(el => el.split('\n').map(el => {
            const split = el.split('\t')
            return split[1] || split[0]
        })).flat(2)

        if(!flattenedTexts.length)
            return null

        //to remove duplicate vins
        if((flattenedTexts[7] === flattenedTexts[8]) || (flattenedTexts[7] === 'Сведения отсутствуют')){
            flattenedTexts.splice(7, 1)
        }

        const autoins = flattenedTexts.reduce((acc, text, idx) => {
            acc[headers[idx]] = text
            return acc
        }, {})

        return autoins
    } catch (e) {
        console.log(e.message)
        return null
    }
}

// const insurance = await getInsuranceByPlate(null, 'м506ур77')
// console.log(insurance)

export {getInsuranceByPlate}