<template>
    <a class="btn" data-bs-toggle="modal" data-bs-target="#exampleModal">
        <IconSetting></IconSetting>
    </a>
    <div class="modal fade bd-example-modal-lg" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true" id="exampleModal">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
        <h5 class="modal-title" id="exampleModalToggleLabel">設定</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="header d-flex">
                <div class="flex-grow-1">
                    <input class="form-input" type="text" placeholder="快速搜尋" v-model.trim="searchText">
                    <button type="button" class="btn btn-light" @click="searchText =''">清空</button>
                </div>
                <button class="btn btn-primary" @click="appendSetting()">另存設定</button>
            </div>
            <hr>
            <div v-for="(item,index) in settings" class="item" :key="item.name" v-show="item.name.indexOf(searchText)>=0">
                <span class="item-title">
                    {{ item.name }}
                </span>
                <div>
                    <button class="btn btn-sm btn-secondary" @click="updateSettingName(item)">
                        編輯名稱
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-info" @click="readSetting(item)">
                        讀取設定
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-success" @click="replaceSetting(item)">
                        覆蓋設定
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" @click="deleteSetting(item,index)">
                        <IconTrashSharp></IconTrashSharp> 
                    </button>
                </div>

            </div>
        </div>
        <div class="modal-footer">
            <!-- <button class="btn btn-primary" data-bs-target="#exampleModalToggle2" data-bs-toggle="modal" data-bs-dismiss="modal">Open second modal</button> -->
        </div>
        </div>
    </div>
    </div>

</template>
<script>
import IconSetting from '~icons/icon-park-outline/setting-two'
import IconTrashSharp from '~icons/ion/trash-sharp'

export default {
    props:{
        settingVar: Array,
        storageName:{
            type: String,
            default: 'saveItems'
        }
    },
    data(){
        return {
            searchText: '',
            settings:[],
        }
    },
    computed:{
        settingFilted(){
            return this.searchText ? this.settings.filter((obj)=>obj.name.indexOf(this.searchText)>=0) : this.settings;
        }
    },
    components:{
        IconSetting,
        IconTrashSharp
    },
    methods:{
        updateSettingName(item){
            item.name = prompt('新增設定名稱');
        },
        readSetting(item){
            // this.settingVar = item
            this.$emit('update:settingVar',item.settingVar)
        },
        replaceSetting(item){
            // alert(JSON.stringify(item))
            item.settingVar = this.settingVar
            // alert(JSON.stringify(item))
        },
        deleteSetting(item,index){
            this.settings.splice(index,1)
        },
        appendSetting(){
            let item = {}
            item.name = prompt('新增設定名稱')
            item.settingVar = this.settingVar
            this.settings.unshift(item)
        }
    },
    mounted(){
        let temp = JSON.parse(localStorage.getItem(this.storageName))
        if(temp?.length){
            this.settings = temp
        }
    },
    watch:{
        settings:{
            handler: function(){
            console.log('save settings')
            localStorage.setItem(this.storageName,JSON.stringify(this.settings))
            },
            deep: true
        }
    }
}

</script>
<style scoped>
.header{
    display: flex;
}
.item{
    display: flex;
}
.item-title{
    flex: 1;

}
.item>*{
    padding: 12px 3px;
}
.item:hover{
    background: lightgray;
}
</style>