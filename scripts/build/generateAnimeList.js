
import {  saveJSON } from './utils.js'
import axios from 'axios'
import * as cheerio from 'cheerio';

async function fetchRemoteData (path) {
    const { data } = await axios.get('https://yuc.wiki' + path)
    .catch((e) => {
        console.error(e)
        return { data: '' }
    })
    return data
}

export default async function generateAnimeMenu (animeMenu) {
    let data = ''
    data = await fetchRemoteData(animeMenu.url)

    const $ = cheerio.load(data)
    let res = [];

    res = Array($('table').length).fill({
        "name": "",
        "date": "",
        "time": "",
        "carrier": "",
        "season": 1,
        "originalName": "",
        "img": "",
        "official": "",
        "description": "",
        "staff":"",
    })
    res = JSON.parse(JSON.stringify(res))

    $('table').each((i,el)=>{
        res[i].img = $(el)?.parent()?.prev()?.find('img')?.attr('src') || 'https://via.placeholder.com/150x225'
        res[i].name = $(el).find('table tr:first-child td:first-child p:nth-child(1)')?.text()?.replace(/第(.+)期/, '')
        res[i].season = parseInt($(el).find('table tr:first-child td:first-child p:nth-child(1)').text().match(/第(.+)期/) ? $(el).find('table tr:first-child td:first-child p:nth-child(1)').text().match(/第(.+)期/)[1] : 1)
        res[i].originalName = $(el).find('table tr:first-child td:first-child p:nth-child(2)').text().replace(/第(.+)期/, '')
        res[i].official = $(el).find('table .link_a')?.attr('href')
        res[i].carrier = { a: "Original", b: "Comic", c: "Novel", d: "Game" }[$(el).find(`td[class^="type"]:nth-child(even)`).attr('class')?.replace(`type_`, '')] || "Original"
        res[i].staff = $(el).find('.staff')?.html()
    })


    saveJSON(animeMenu.name, res)
    return res
}