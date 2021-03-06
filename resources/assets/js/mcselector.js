class MCSelector {
    constructor(options) {
        this.defaults = {
            mode : 'full', // full:带选择 single 单上传
            uploader: {
                pick: {
                    id: '#uploadBtn',
                    label: '<i class="feather icon-upload"></i>&nbsp;选择文件',
                    multiple: false,
                    style: ''   // 使用自定义按钮样式 注释后使用webupload默认按钮样式
                },
                swf: './Uploader.swf',
                chunked: false,
                chunkSize: 512 * 1024,

                // 禁掉全局的拖拽功能。这样不会出现图片拖进页面的时候，把图片打开。
                disableGlobalDnd: true,
                fileNumLimit: 20,
                fileSizeLimit: 200 * 1024 * 1024,    // 200 M
                fileSingleSizeLimit: 50 * 1024 * 1024,    // 50 M
            },
            selector: {
                dialog: null,
                button: '.submit-btn',
                cancel: '.cancel-btn',
                multiple: false,
                max: 0,
                values: []
            },
            lang: {
                file_type_denied: '不允许上传此类型文件',
                exceed_num_limit: '已超出文件上传数量限制',
                exceed_file_size: '当前选择的文件过大',
                exceed_size_limit: '已超出文件大小限制',
                file_duplicate: '文件重复',
                exceed_max_item: '已超出最大可选择的数量',
            },
        };

        this.options = $.extend({}, this.defaults, options);

        //console.log('uploader', this.options.uploader);
        this.options.uploader.server = options.config.uploadService; // 上传服务
        this.options.uploader.pick.style = ''; // 使用自定义按钮样式 注释后使用webupload默认按钮样式

        if (options.config.type != 'blend')
        {
            this.options.uploader.accept = {
                title : options.config.type,
                extensions: options.config.ext,
            }
        }
        //console.log('accept', this.options.uploader.accept);

        //验证文件总数量 && 是否开起同时选择多个文件能力
        if (options.config.length!=0)
        {
            var length = options.config.length;
            this.options.uploader.fileNumLimit = length;
            this.options.selector.max = length;
            if (length>1) {
                this.options.uploader.pick.multiple = true;
                this.options.selector.multiple = true;
            }else{
                this.options.uploader.pick.multiple = false;
                this.options.selector.multiple = false;
            }
        }

        // 实例化
        this.uploader = WebUploader.create(this.options.uploader);

        // UI input显示内容,只显示文件名
        this.fieldVals = [];

        this.dialog = $('#'+this.options.selector.dialogId);
    }

    build(){
        let uploader = this.uploader,
            // 实际field input显示数据内容
            uploadedFiles = [],
            fileIds = [],
            mode = this.options.mode,
            lang = this.options.lang,
            state = 'pedding';  // 可能有pedding, ready, uploading, confirm, done.
        var fileCount = 0;
        var fileSize = 0;

        console.log('mode', mode);

        uploader.on('ready', function() {
            window.uploader = this.uploader;
        });

        // 文件添加队列事件监听
        uploader.onFileQueued = function( file ) {
            fileCount++;
            fileSize += file.size;

            uploader.upload();

        };

        // 监听上传状态
        uploader.on( 'all', function( type, obj, ret ) {
            var stats;
            switch( type ) {
                case 'uploadFinished':
                    setState( 'confirm' );
                    break;

                case 'startUpload':
                    setState( 'uploading' );
                    break;

                case 'stopUpload':
                    setState( 'paused' );
                    break;

                case  'uploadAccept':
                    //console.log('uploadAccept:', obj, ret);
                    uploadAccept( obj, ret )
                    break;

            }
        });

        // 上传出错
        uploader.onError = function( code ) {
            switch (code) {
                case 'Q_TYPE_DENIED':
                    Dcat.error(lang.file_type_denied);
                    break;
                case 'Q_EXCEED_NUM_LIMIT':
                    Dcat.error(lang.exceed_num_limit);
                    break;
                case 'F_EXCEED_SIZE':
                    Dcat.error(lang.exceed_file_size);
                    break;
                case 'Q_EXCEED_SIZE_LIMIT':
                    Dcat.error(lang.exceed_size_limit);
                    break;
                case 'F_DUPLICATE':
                    Dcat.warning(lang.file_duplicate);
                    break;
                default:
                    Dcat.error('Error: ' + code);
            }
        };

        // 上传状态
        let setState = ( val ) => {
            var file, stats;

            if ( val === state ) {
                return;
            }

            state = val;

            switch ( state ) {
                case 'uploading':
                    uploading();
                    break;
                case 'confirm':
                    confirm();
                    break;
                case 'finish':
                    finish();
                    break;
                default:
                    console.log('state: ' + state);
            }
        };

        // 状态方法
        let uploading = () => {
            //console.log('status: uploading!');
            //Dcat.info( '开始上传...' );
        };
        let finish = () => {
            //console.log('status: finish!');
            var stats = uploader.getStats();
            if ( stats.successNum ) {
                Dcat.success( '完成上传' );
                /*
                if (mode !== 'full') {
                    setTimeout(function(){
                        location.reload();
                    },3000);
                }*/
            } else {
                // 没有成功的图片，重设
                state = 'done';
            }
        };
        let confirm = () => {
            //console.log('status: confirm!');
            var stats = uploader.getStats();
            if ( stats.successNum && !stats.uploadFailNum ) {
                setState( 'finish' );
                return;
            }
        }

        // 完成上传
        let uploadAccept = (obj, result) => {

            if (!result || !result.status) {
                Dcat.error(result.data.message);
                return false;
            }
            Dcat.success(result.data.name + ' ' +result.data.message);

            if (mode == 'full') {
                // 上传成功，保存新文件名和路径到file对象
                obj.file.id         = result.data.id;
                obj.file.name       = result.data.name;
                obj.file.path       = result.data.path;
                obj.file.fileType   = result.data.fileType;
                obj.file.url        = result.data.url || null;
                obj.file.thumbnail  = result.data.thumbnail || null;

                setFieldVal(obj.file);
                addUploadedFile(obj.file);
            }
        };

        // 为Field赋值
        let setFieldVal = (fileObj, plus = true) => {
            var files = uploader.getFiles();
            if (plus) {
                var file = {
                    id: fileObj.id,
                    name: fileObj.name,
                    path: fileObj.path,
                    fileType: fileObj.fileType,
                    thumbnail: fileObj.thumbnail
                }
                uploadedFiles.push(file);
                fileIds.push(fileObj.id);
                this.fieldVals.push(fileObj.path);
            } else {
                var len = uploadedFiles.length;
                for (var i = 0; i < len; i++) {
                    if (uploadedFiles[i].id == fileObj.id) {
                        uploadedFiles.splice(i, 1);
                        fileIds.splice(i, 1);
                        this.fieldVals.splice(i, 1);
                        break;
                    }
                }
                var flen = files.length;
                for (var j = 0; j < flen; j++) {
                    if (files[j].id == fileObj.id) {
                        uploader.removeFile(files[j], true);
                        break;
                    }
                }
            }
            setField();
        };

        let setField = () => {
            if (uploadedFiles.length != 0) {
                console.log('ids: '+ fileIds);
                // 赋值之前去掉thumbnail
                var fieldVal = [];
                uploadedFiles.forEach(function(item){
                    fieldVal.push({
                        id: item.id,
                        name: item.name,
                        path: item.path,
                        fileType: item.fileType,
                    });
                });
                $('#field_' + this.options.fieldId).val(JSON.stringify(fieldVal));
                $('#' + this.options.fieldId).val(this.fieldVals.join(','));
            }else{
                $('#field_' + this.options.fieldId).val('');
                $('#' + this.options.fieldId).val('');
            }
        };

        // 显示上传文件
        let addUploadedFile = ( file ) => {
            console.log('add uploaded file!')
            var html = '<li class="list-inline-item" data-id="' + file.id + '">';
            if (file.fileType == 'image'){
                html+='<img data-src="' + file.url + '" src="'+file.thumbnail+'" class="img img-thumbnail spotlight">';
            }else if(file.fileType == 'audio'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-audio-o file-icon"></i></div>';
            }else if(file.fileType == 'video'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-video-o file-icon"></i></div>';
            }else if(file.fileType == 'code'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-code-o file-icon"></i></div>';
            }else if(file.fileType == 'zip'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-zip-o file-icon"></i></div>';
            }else if(file.fileType == 'text'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-text-o file-icon"></i></div>';
            }else if(file.fileType == 'word'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-word-o file-icon"></i></div>';
            }else if(file.fileType == 'xls'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-excel-o file-icon"></i></div>';
            }else if(file.fileType == 'ppt'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-powerpoint-o file-icon"></i></div>';
            }else if(file.fileType == 'pdf'){
                html+='<div class="img-thumbnail"><i class="fa fa-file-pdf-o file-icon"></i></div>';
            }else{
                html+='<div class="img-thumbnail"><i class="fa fa-file-o file-icon"></i></div>';
            }
            html += '<a class="remove_media_display" alt=" 删除 "><i class="fa fa-trash"></i></a>';
            html += '<div class="d-flex justify-content-between item tools">';
            html += '<a class="faicon fa fa-angle-left"></a><a class="faicon fa fa-angle-right"></a>';
            html += '</div></li>';

            $('.field_' + this.options.fieldId + '_display').append(html);

            // 删除
            $('.remove_media_display').off('click').on('click', function () {
                var id = $(this).parent().attr('data-id');
                //console.log('ddd'+id);
                var delFile = {id:id};
                setFieldVal(delFile, false);
                $(this).hide().parent().remove();
                return false;
            });
            // 前移
            $('.fa-angle-left').off('click').on('click', function () {
                //console.log('prev');
                var parentLi = $(this).parent().parent();
                var prev = parentLi.prev();
                if (prev.html()!=undefined)
                {
                    prev.before(parentLi);
                    moveIndex(parentLi.attr('data-id'), 0);
                }
                return false;
            });
            // 后移
            $('.fa-angle-right').off('click').on('click', function () {
                //console.log('next');
                var parentLi = $(this).parent().parent();
                var next = parentLi.next();
                if(next.html()!=undefined)
                {
                    next.after(parentLi);
                    moveIndex(parentLi.attr('data-id'), 1);
                }else{
                    return false;
                }
            });
        }
        let moveIndex = (id,left) => {
            var index = fileIds.indexOf(parseInt(id));
            var index2 = (left == 1) ? index+1 : index-1;
            //console.log('ids: '+ fileIds + 'index: '+index + 'index2: '+index2);
            swap(fileIds, index, index2);
            swap(uploadedFiles, index, index2);
            swap(this.fieldVals, index, index2);
            //console.log('ids---- '+ fileIds);
            setField();
        }
        // 调整元素顺序
        let swap = (arr, index1, index2)  => {

            arr[index1] = arr.splice(index2, 1, arr[index1])[0];

            return arr;

        }

        //  初始化
        let initUI = () => {
            console.log('init UI ');
            if (typeof this.options.fieldVal == "undefined" || this.options.fieldVal == ''){
                return false;
            }
            //console.log(this.options.fieldVal);
            var fieldVals =  JSON.parse(this.options.fieldVal);

            for(var i=0;i<fieldVals.length;i++){

                var file = fieldVals[i];
                setFieldVal(file);
                file.url = this.options.config.pathUrl + file.path;
                addUploadedFile(file, i);
            }
        };

        let reloadPreviews = () => {
            console.log('reload Previews');
            // 清空重建预览
            $('.field_' + this.options.fieldId + '_display').html('');

            var len = uploadedFiles.length;
            for (var i=0; i<len; i++){

                var file = uploadedFiles[i];
                file.url = this.options.config.pathUrl + file.path;

                addUploadedFile(file);
            }
        };

        if (mode == 'full') {
            initUI();
        }

        //selector
        $(document).on('table:loaded', function () {
            initSelector();
        });

        // selector
        let initSelector = () => {
            console.log('init selector ');
            let checkbox = getCheckbox(),
                dialog = this.dialog,
                options = this.options.selector,
                lang = this.options.lang;

            // 绑定提交按钮
            dialog.find('.submit-btn').on('click', function () {
                console.log('bind submit!');
                reloadPreviews();
            })

            // 绑定checkbox
            checkbox.on('change', function () {
                let $this = $(this),
                    id = $this.data('id'),
                    name = $this.data('file_name'),
                    path = $this.data('path'),
                    type = $this.data('type');
                var imgDiv = $this.parent().parent().prev();
                var thumbnail = imgDiv.children('.spotlight').attr('src');

                if (this.checked) {

                    if (options.max && (uploadedFiles.length+1 > options.max)) {
                        $this.prop('checked', false);
                        return Dcat.warning(lang.exceed_max_item);
                    }
                    setFieldVal({id: id, name: name, path: path, fileType: type, thumbnail: thumbnail});
                    setChecked(id);
                } else {

                    setFieldVal({id:id}, false);
                    unsetChecked(id);
                }
            })

            render();
        };

        let getCheckbox = () => {
            var checkbox = this.dialog.find("input[type='checkbox']");
            return checkbox;
        };

        let render = () => {

            var len = uploadedFiles.length;
            for (var i=0; i<len; i++){
                var selected = uploadedFiles[i]
                setChecked( selected.id );
            }
        };

        let setChecked = (sltId) => {

            this.dialog.find('#file_'+sltId).addClass('bg-success');
            this.dialog.find('#'+sltId).attr('checked', 'checked');
            this.dialog.find('#'+sltId).addClass('checked');
        };

        let unsetChecked = (sltId) => {

            this.dialog.find('#file_'+sltId).removeClass('bg-success');
            this.dialog.find('#'+sltId).attr('checked', '');
            this.dialog.find('#'+sltId).removeClass('checked');
        };

    }
}
