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

        const flattenedTexts = texts.map(el => el.split('\n').map(el => {
            const split = el.split('\t')
            return split[1] || split[0]
        })).flat(2)

        if(!flattenedTexts.length)
            return null

        if(flattenedTexts[7] === flattenedTexts[8]){//to remove duplicate vins
            flattenedTexts.splice(8, 1)
        }

        const autoins = uniqueFlatText.reduce((acc, text, idx) => {
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