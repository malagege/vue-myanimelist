<template>
    <div class="container">
        <div class="myanimelist">
            <!-- [v-for 循环时直接使用v-model绑定value报错 - 简书](https://www.jianshu.com/p/947b2aa0cd8c) -->
            <MyAnimeListItem v-for="(item,i) in items" v-model:item="items[i]" :key="item.img" />
        </div>
    </div>

</template>
<script>
import MyAnimeListItem from './MyAnimeListItem.vue'
import axios from 'axios'
import json from '../../src/assets/json/AnimeMenu.json'

export default{
    props:{
        jsonpath: String
    },
    components: {
        MyAnimeListItem
    },
    data(){
        return {
            items:[]
        }
    },
    mounted(){
        console.log(this.jsonpath)
        let selected = json.find((obj)=> obj.url === ('/'+this.jsonpath) ) || json[0]
        console.log(selected)
        axios.get(`src/assets/json/${selected.name}.json`).then(res => this.items = res.data)

    },
    async beforeRouteUpdate(to, from) {
    // 對路由變化做出響應...
    // this.userData = await fetchUser(to.params.id)
    console.log('to',to,'from',from);
    let selected = json.find((obj)=> obj.url === ('/'+to.params.jsonpath) ) || json[0]
    axios.get(`src/assets/json/${selected.name}.json`).then(res => this.items = res.data)
  },
}
</script>
<style scoped>
.myanimelist{
    display: grid;
    grid-template-columns: repeat(4, 1fr)
}

/* [css - Flex-box: Align last row to grid - Stack Overflow](https://stackoverflow.com/questions/18744164/flex-box-align-last-row-to-grid) */
/* .myanimelist::after{
    content: "";
    flex: auto;
} */
</style>