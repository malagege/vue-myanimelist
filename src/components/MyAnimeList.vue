<template>
    <div class="container">
        <div class="myanimelist">
            <!-- [v-for 循环时直接使用v-model绑定value报错 - 简书](https://www.jianshu.com/p/947b2aa0cd8c) -->
            <MyAnimeListItem v-for="(item,i) in items" v-model:item="items[i]" :key="item.img" />
        </div>
    </div>

</template>
<script>
import MyAnimeListItem from '@components/MyAnimeListItem.vue'
import axios from 'axios'

export default{
    components: {
        MyAnimeListItem
    },
    data(){
        return {
            items:[]
        }
    },
    mounted(){
        axios.get('src/assets/animelist.json').then(res => this.items = res.data)

    }
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