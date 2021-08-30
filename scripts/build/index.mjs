import ora from 'ora'
import generateAnimeMenu from './generateAnimeMenu.mjs'
import generateAnimeList from './generateAnimeList.mjs'

(async () => {
    const spinner = ora('Strart pre-building...').start()
    try {

      let data = await generateAnimeMenu()
      // console.log(data)
      // data.forEach(item =>{
        for (let index = 0; index < data.length; index++) {
          const element = data[index];
          spinner.text  = `正在產生 ${element.name} 中...`
          await generateAnimeList(element)
        }
      // })
      spinner.succeed('Done!')
    } catch (e) {
      console.log(e)
      spinner.fail('Failed!')
    }
  })()
  