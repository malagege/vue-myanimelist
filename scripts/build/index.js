import ora from 'ora'
import generateAnimeMenu from './generateAnimeMenu.js'

(async () => {
    const spinner = ora('Strart pre-building...').start()
    try {
      await Promise.all([
        generateAnimeMenu()
      ])
      spinner.succeed('Done!')
    } catch (e) {
      console.log(e)
      spinner.fail('Failed!')
    }
  })()
  