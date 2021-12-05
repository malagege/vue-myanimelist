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
                <file-reader @load="loadFileText($event)">
                    <div class="btn btn-secondary">匯入檔案</div>
                </file-reader>
                <button class="btn btn-primary" @click="appendSetting()">另存設定</button>
            </div>
            <hr>
            <div v-for="(item,index) in settings" class="item" :key="item.name" v-show="item?.name?.indexOf(searchText)>=0">
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
                    <button class="btn btn-sm btn-secondary" @click="downloadTextFile(item)">
                        <FileDownload></FileDownload>
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
import FileDownload from '~icons/ri/file-download-fill'
import FileReader from '../utils/FileReader.vue'

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
            text: '',
        }
    },
    computed:{
        settingFilted(){
            return this.searchText ? this.settings.filter((obj)=>obj?.name?.indexOf(this.searchText)>=0) : this.settings;
        }
    },
    components:{
        IconSetting,
        IconTrashSharp,
        FileReader,
        FileDownload,
    },
    methods:{
        updateSettingName(item){
            let name = prompt('修改設定名稱')
            if(name){
                item.name = name
            }
        },
        readSetting(item){
            // this.settingVar = item
            this.$emit('update:settingVar',item.settingVar)
        },
        downloadTextFile(item){
            let JSONData = [JSON.stringify(item)];
            let JSONBlob = new Blob(JSONData, { type: 'application/json' });
            this.saveData(JSONBlob, `${item?.name || '未命名'}.json`);
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
            if(item?.name){
                this.settings.unshift(item)
            }
        },
        loadFileText(text){
            try{
        
                let item = JSON.parse(text);

                // item.name = prompt('新增設定名稱')
                // item.settingVar = this.settingVar
                let {name,settingVar} = item;
                if(name && settingVar){
                    this.settings.unshift(item)
                }else{
                    alert("內容格式有缺失，無法匯入!!");
                }
            }catch(e){
                console.error(e);
                alert('匯入 JSON 發生錯誤，有可能是格式錯誤!!')
            }
        },
        saveData(blob, fileName) { // 參考: [[WebAPIs] Blob, File 和 FileReader | PJCHENder 未整理筆記](https://pjchender.dev/webapis/webapis-blob-file/)
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';

            // 將 blob 放到 URL 上
            let url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();

            // 釋放記憶體
            a.href = '';
            window.URL.revokeObjectURL(url);
            }
    },
    mounted(){
        try{
            let temp = JSON.parse(localStorage.getItem(this.storageName))
            if(temp?.length){
                this.settings = temp
            }
        }catch(e){
            console.error(e);
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