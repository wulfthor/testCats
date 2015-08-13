'use strict';

/*
 * Angular Controllers
 *
 * */

/*jslint browser: true*/
/*jslint white: true,  plusplus: true */
/*jslint unparam: true*/

/*global $, angular, alert, Blob, BlobBuilder, URL, webkitURL, loginModalInstanceCtrl,
            ModalInstanceCtrl, FileAPI, FileReader*/

angular.module('myApp.controllers', ['ui.bootstrap', 'angularFileUpload']).
    controller('AppCtrl', ['$scope', '$http', 'state', '$location', '$modal', 'catsAPIservice',
                           function ($scope, $http, state, $location, $modal, catsAPIservice) {

    /* Initialize the state */
    state.filter = {};
    state.uploadedImage = {};
    state.deleteImage = {index: ''};
    state.searchRequested = false;
    state.loggedin = false;
    state.role = '';
    state.email = '';

    /* Initialize sample types for filter UI
     * All our catsAPIservice functions return an HttpPromise object (see $http module)
     * containing success and error handler functions.
     * Here, we pass each of these promise functions a (nameless) function to be called if the
     * request succeeds or fails. */

    /*jslint nomen: true*/
    catsAPIservice.getVocab("sampleTypes")
    .success(function (resp) {
        if(resp && resp[0] && resp[0]._id){
            state.sampleTypes = resp[0].items;
        }
    }).error(function (err) {
        alert('Sample Types could not be read. Database is probably not running.');
    });

    /* Update login state for this controller whenever user logs in/out*/
    $scope.$watch(
            function() { return state.loggedin; },
            function(newValue, oldValue) {
                $scope.loggedin = newValue;
                if (newValue) {
                    $scope.email = state.email;
                    $scope.role = state.role;
                }else{
                    $scope.email = '';
                    $scope.role = '';
                }
            }
    );

    /* Initialize login state*/
    catsAPIservice.loggedin().success(function (response) {
        state.loggedin = (response === "0") ? false : true;
        state.email = (response === "0") ? '' : response.username;
        state.role = (response === "0") ? '' : response.role;
        $scope.$apply();  /*or the watch above will not be called*/
    }).error(function (err) {
        state.loggedin = false;
        $scope.$apply();
    });
    /*jslint nomen: false*/

    /* Opens the user login modal window*/
    $scope.loginUser = function () {
        var loginModalInstance =  $modal.open({
            size: 'sm',
            templateUrl:'myLoginContent',
            controller: loginModalInstanceCtrl
        });
    };

    $scope.logout = function() {
        catsAPIservice.logout()
        .success(function (response) {
            state.loggedin = false;
            $scope.loggedin = state.loggedin;
        })
        .error(function (err) {
            alert(err);
        });
    };

    /* Search button click directs over to the search controller
       and saves the search term for use when triggered by searchRequested
       flag */
    $scope.searchClicked = function(searchTerm) {
        $location.path('/search');
        state.searchTerm = searchTerm;
        state.searchRequested = true;
        console.log("into searchcontroller " + state.searchTerm);
        $scope.$apply();
    };
}]).
controller('SearchController', ['$q', '$scope', 'catsAPIservice', 'state', '$modal', '$log', '$location',

                                function ($q, $scope, catsAPIservice, state, $modal, $log, $location) {

    //  $scope.loggedin = state.loggedin;
    $scope.sampleTypes = state.sampleTypes;


    /* These must be read here, otherwise the list will be empty when
     * the browser 'back' button is pressed after viewing a single record
     *
     * Maybe fixed this with apply and moving watches
     */
    $scope.searchResultsPage = state.searchResultsPage;
    $scope.searchResultsTotalSize = state.searchResultsTotalSize;
    $scope.searchTerm = state.searchTerm;
    $scope.filter = state.filter;
    $scope.switchStatus = state.filter.isOpen;

    /*pagination*/
    $scope.totalItems = state.searchResultsTotalSize || 1;
    state.searchResultsPageNum  = state.searchResultsPageNum || 1;
    $scope.searchResultsPageNum = state.searchResultsPageNum;
    $scope.maxSize = 10;
    $scope.itemsPerPage = 20;

    $scope.setPage = function (pageNum) {
        $scope.searchResultsPageNum = pageNum;
        state.searchResultsPageNum =  $scope.searchResultsPageNum;
    };

    $scope.pageChanged = function() {
       // console.log('Page changed to: ' + $scope.searchResultsPageNum);
        state.searchResultsPageNum = $scope.searchResultsPageNum;
        $scope.search();
      };

    /* Update login state whenever user logs in/out */
    $scope.$watch(
        function() { return state.loggedin; },
        function(newValue, oldValue) {
            $scope.loggedin = newValue;
            if (newValue) {
                $scope.role = state.role;
                $scope.username = state.username;
                $scope.email = state.email;
            }else{
                $scope.role = state.role;
                $scope.username = state.username;
                $scope.email = '';
            }
        }
    );

//  $scope.$watch(
//  function() { return $scope.filter; },
//  function(newValue, oldValue) {
//  if ( newValue !== oldValue ) {
//  state.filter = newValue;
//  /* state.searchRequested = true; don't do this as it updates too often */
//  }
//  },
//  /* Object equality === true, because we want to find out
//  * if the inner values have changed. The whole object is
//  * angular.copied for comparison (the default behavior is
//  * reference equality)*/
//  true
//  );

    /* The actual search is triggered here by the 'searchRequested' flag changing */
    $scope.$watch(
            function() { return state.searchRequested; },
            function(newValue, oldValue) {
                if ( newValue === true ) {
                    $scope.search();
                    state.searchRequested = false;
                }
            }
    );

    /* Call the full text search service (currently returns 100 results) */
    $scope.search = function() {
        catsAPIservice.search(state.searchTerm, $scope.filter,
                              $scope.itemsPerPage, $scope.searchResultsPageNum)
        .success(function (response) {
            $scope.searchTerm = state.searchTerm;
            $scope.searchResultsPage = response;
            state.searchResultsPage = response;
            $scope.searchCount();
        });
    };

    /* Get the total number of results */
    $scope.searchCount = function() {
        catsAPIservice.searchSize(state.searchTerm, $scope.filter)
        .success(function (response) {
            $scope.searchResultsTotalSize = response;
            state.searchResultsTotalSize = response;
            $scope.totalItems = state.searchResultsTotalSize;
        }).error(function (err) {
            $scope.searchResultsTotalSize = 0;
            state.searchResultsTotalSize = 0;
        });
    };

    $scope.filterChanged = function(searchTerm) {
        state.filter = $scope.filter;
        state.searchRequested = true;
    };

    /* Clicking on a reference number will direct over to view mode
     * and save the sample details so the view controller can retrieve them
     */
    $scope.viewSample = function(index) {
        $location.path('/view');
        state.sample = state.searchResultsPage[index];
        state.itemIndex = index;
        state.create = false;
    };

    $scope.registerClicked = function(sample) {

        state.registerRequested = true;
        state.sample = {};
        if (sample){
            state.sample = sample;
        }
    };

    /* Delete a single sample record */
    $scope.deleteClicked = function(sampleId) {

        catsAPIservice.delete(sampleId).success(function (response) {
            state.searchRequested = true; // Refresh search
            alert('Record deleted');
        });
    };

    /* Look for updates on artwork */
    $scope.updateArtworkClicked = function(sampleArtworkId) {
        console.log("into update");
        // getArtworkSMK
        // getArtworkSample
        // compare
        // if difference then updateArtworkSample

        catsAPIservice.readDiff(sampleArtworkId).success(function (response) {
            console.log("into readAW");
            var firstObj = response;
            console.log(JSON.stringify(firstObj));
        });
    };

    /* Needed for older browsers which don't support click() on href's  */
    var fakeClick = function(anchorObj) {
        /*try to click()*/
//      if (anchorObj.click){
//      anchorObj.click();
//      anchorObj.fireEvent("onclick");
//      }else{
        if(document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            anchorObj.dispatchEvent(evt);
        }
    },

    /* Generates an excel formatted file (xlsx) containing the search results
     * and triggers a file download
     */
    createExportDoc = function(searchTerm, filter) {

        var objectUrl,
            hiddenElement,
            blob = null,
            docType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        catsAPIservice.Excel(searchTerm, filter).success(function (response) {

            /*package the newly generated spreadsheet data as blob we can use for file download*/
            try{
                blob = new Blob([response], {type: docType});
            }
            catch(e){
                /* TypeError old Chrome and FF*/
                window.BlobBuilder = window.BlobBuilder ||
                window.WebKitBlobBuilder ||
                window.MozBlobBuilder ||
                window.MSBlobBuilder;

                if(e.name === 'TypeError' && window.BlobBuilder){
                    var bb = new BlobBuilder();
                    bb.append(response);
                    blob = bb.getBlob(docType);
                }
                else if(e.name === "InvalidStateError"){
                    /* InvalidStateError (tested on FF13 WinXP)*/
                    blob = new Blob( [response], {type : docType});
                }
                else{
                    alert("Your browser doesn't support this. " +
                    "Please try again with a more recent browser.");
                }
            }
            try {
                objectUrl = URL.createObjectURL(blob);
            }
            catch (e) {
                /* Try again, some browsers support this syntax instead */
                if(e.type === 'not_defined' && e.arguments[0] === 'URL'){
                    objectUrl = webkitURL.createObjectURL(blob);
                }
            }

            /* Create a reference and fake a click to start the download */
            hiddenElement = document.createElement('a');
            hiddenElement.setAttribute('href', objectUrl);
            hiddenElement.setAttribute('download', "cats_export.xlxs");
            fakeClick(hiddenElement);
        });
        //TODO: add failure case
    };

    /* Fetches artwork details for a list of samples and
     * adds them to the sample data. When all the responses
     * have been received, creates an excel doc.
     */
    $scope.exportClicked = function(searchTerm, filter) {

        createExportDoc(searchTerm, filter);
    };
}]).
//controller('BrowseController', ['$scope',
//
//                                function ($scope) {
//
//}]).
controller('ViewController', ['$scope', 'state', 'catsAPIservice', '$location',

                              function ($scope, state, catsAPIservice, $location) {

    /* Retrieve the sample details from the state service*/
    //  $scope.record = state.sample;
    $scope.itemIndex = state.itemIndex;   //index within the current page, set by click in list
    $scope.numResults = state.searchResultsPage.length;
    $scope.record = state.searchResultsPage[$scope.itemIndex];
    $scope.searchResultsPageNum = state.searchResultsPageNum;
    $scope.itemsPerPage = 20;
    $scope.searchResultsTotalSize = state.searchResultsTotalSize;

    $scope.statusMeta = {
            isSampleOpen: true,
            isArtworkOpen: true,
            isAnalysisOpen: true,
            isFirstDisabled: false
    };

    /* Call the full text search service */
    $scope.search = function() {
        catsAPIservice.search(state.searchTerm, state.filter,
                              $scope.itemsPerPage, $scope.searchResultsPageNum)
        .success(function (response) {
            state.searchResultsPage = response;
            $scope.record = state.searchResultsPage[$scope.itemIndex];
            /*force image update, that's why we delayed setting this until now*/
            state.itemIndex = $scope.itemIndex;
        });
    };

    $scope.nextItem = function(){

        $scope.itemIndex = $scope.itemIndex + 1;

        /* if page index has reached the end of the page*/
        if($scope.itemIndex === state.searchResultsPage.length){

            /* if there are no more pages*/
            if((($scope.itemsPerPage * ($scope.searchResultsPageNum - 1)) + $scope.itemIndex) >= $scope.searchResultsTotalSize){
                /*wrap around*/
                $scope.searchResultsPageNum = 1;
                state.searchResultsPageNum = $scope.searchResultsPageNum;
                $scope.itemIndex = 0; /*don't update state yet*/
            }
            else{
            /*fetch next page of results*/
                $scope.searchResultsPageNum = state.searchResultsPageNum + 1;
                state.searchResultsPageNum = $scope.searchResultsPageNum;
                $scope.itemIndex = $scope.itemIndex % $scope.itemsPerPage; /*don't update state yet*/
            }
            $scope.search();
        }
        else{
            $scope.itemIndex = $scope.itemIndex % state.searchResultsPage.length;
            $scope.record = state.searchResultsPage[$scope.itemIndex];
            state.itemIndex = $scope.itemIndex;
        }
    };

    $scope.previousItem = function(){
        $scope.itemIndex = $scope.itemIndex - 1;

        /* if page index has reached the start of the page*/
        if($scope.itemIndex < 0){

            /* if there are no more pages*/
            if($scope.searchResultsPageNum <= 1){
                /*wrap around*/
                $scope.searchResultsPageNum = Math.ceil($scope.searchResultsTotalSize / $scope.itemsPerPage);
                state.searchResultsPageNum = $scope.searchResultsPageNum;
                $scope.itemIndex = (($scope.searchResultsTotalSize % $scope.itemsPerPage) || $scope.itemsPerPage) - 1; /*don't update state yet*/
            }
            else{
            /*fetch previous page of results*/
                $scope.searchResultsPageNum = state.searchResultsPageNum - 1;
                state.searchResultsPageNum = $scope.searchResultsPageNum;
                $scope.itemIndex = $scope.itemsPerPage - 1; /*don't update state yet*/
            }
            $scope.search();
        }
        else{
            $scope.itemIndex = ($scope.itemIndex < 0) ? (state.searchResultsPage.length - 1) : $scope.itemIndex;
            $scope.record = state.searchResultsPage[$scope.itemIndex];
            state.itemIndex = $scope.itemIndex;
        }
    };

    $scope.backToSearch = function() {
        $location.path('/search');
    };
}]).
controller('DatepickerCntrl', ['$scope',

                               function ($scope) {

    $scope.open = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.opened = true;
    };

    $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1,
            datepickerMode: 'day'
    };

    $scope.initDate = new Date('1970-01-01T01:00:00.000Z');
    $scope.formats = ['dd/MM/yyyy'];
    $scope.format = $scope.formats[0];
}]).
controller('RegisterCtrl', ['$scope', '$modal', '$log', 'state', 'catsAPIservice',

                            function ($scope, $modal, $log, state, catsAPIservice) {

    /* Open the modal dialog */
    $scope.open = function (size) {
        var modalInstance = $modal.open({
            templateUrl: 'myModalContent',
            controller: ModalInstanceCtrl,
            size: size,
            backdrop: 'static',
            resolve:{ /* These are resolved before controller is initialized */
                vocabsArray : function () {
                    /* Each time we start the 'register' modal, read the whole vocabulary block */
                    return catsAPIservice.getVocab()
                    .then (function (resp) {
                        if(resp && resp.data && resp.data[0]){
                            /* Return the array of vocabularies */
                            return resp.data;
                        }
                    });
                }
            }
        });
        modalInstance.result.then(function (selectedItem) {
            $scope.selected = selectedItem;
        }, function () {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    /* Catch the registerRequested event and
     * open the modal window
     */
    $scope.$watch(
        /* This is the listener function */
        function() { return state.registerRequested; },
        /* This is the change handler */
        function(newValue, oldValue) {
            if ( newValue === true ) {
                $scope.open('lg');
                state.registerRequested = false;
            }
        }
    );
}]).
controller('ImageUploadController', ['$scope', '$upload', '$timeout', 'state',

                                     function ($scope, $upload, $timeout, state) {

    /*See upload.js in angular-file-upload for an example file upload controller*/

    $scope.alerts = [];

    $scope.fileReaderSupported = window.FileReader !== null && (window.FileAPI === null || FileAPI.html5 !== false);
    $scope.uploadRightAway = false;

    $scope.getThumbnail = function(url) {
        var width = 200,
            imageurl,
            smkInternal = 'http://cspic.smk.dk/';
        if (url.indexOf(smkInternal) !== -1){
            imageurl = url.replace(smkInternal, 'https://catsdb.smk.dk/cspic/?pic=')
                       + "&mode=width&width=" + width;
        } else {
            imageurl = url + "?mode=width&width=" + width;
        }
        return imageurl;
//        return url.replace('http://cspic.smk.dk/', 'http://cspic.smk.dk/?pic=')
//        + "&mode=width&width=200";
    };

    $scope.deleteImage = function(i) {
        state.deleteImage = {index : i};
    };

    $scope.hasUploader = function(index) {
        return $scope.upload[index] !== null;
    };

    $scope.cancel = function(index) {
        if($scope.hasUploader(index)){
            $scope.upload[index].abort();
            $scope.upload[index] = null;
        }
    };

    /*
     * User status notifications
     */
    var uploadSuccess = function(message) {

        $scope.alerts.push({type: 'success', msg: message, icon: 'glyphicon glyphicon-ok'});

        $timeout(function(){
            $scope.alerts.splice(0, 1);
            $timeout(function() {
            },1000);
        }, 3000);
    },
    uploadFailed = function(message) {

        $scope.alerts.push({type: 'danger', msg: message,
            icon: 'glyphicon glyphicon-warning-sign'});
        $timeout(function(){
            $scope.alerts.splice(0, 1);
        }, 3000);
    },
    loadFile = function(fileReader, index) {
        fileReader.onload = function(e) {
            $timeout(function() {
                $scope.dataUrls[index] = e.target.result;
            });
        };
    };

    $scope.onFileSelect = function($files) {

        var i, $file, fileReader;

        $scope.selectedFiles = [];
        $scope.progress = [];
        if ($scope.upload && $scope.upload.length > 0) {
            for (i = 0; i < $scope.upload.length; i++) {
                if ($scope.upload[i] !== null) {
                    $scope.upload[i].abort();
                }
            }
        }
        $scope.upload = [];
        $scope.uploadResult = [];
        $scope.selectedFiles = $files;
        $scope.dataUrls = [];

        for (i = 0; i < $files.length; i++) {
            $file = $files[i];
            if ($scope.fileReaderSupported && $file.type.indexOf('image') > -1) {
                fileReader = new FileReader();
                fileReader.readAsDataURL($files[i]);
                loadFile(fileReader, i);
            }
            $scope.progress[i] = -1;
            if ($scope.uploadRightAway) {
                $scope.start(i);
            }
        }

        $scope.start = function(index) {
            $scope.progress[index] = 0;
            $scope.errorMsg = null;
            $scope.upload[index] = $upload.upload({
                url: 'image',
                method: 'POST',
                data: {myObj: $scope.myModelObj},
                file: $scope.selectedFiles[index]
            });
            $scope.upload[index].then(function(response) { /*then.(success, error, progress)*/
                /*success*/
                $scope.uploadResult.push(response.statusText);
                var image = {};
                image.name = $scope.selectedFiles[0].name;
                image.url = response.data;
                state.uploadedImage = image;
                uploadSuccess("Image successfully uploaded");
            }, function(response) {
                /*error*/
                if (response.status > 0){
                    if (response.status === 409){
                        uploadFailed(" An image with this name already exists. Please rename the image and try again.");
                    }
                    else if (response.status === 413){
                        uploadFailed(" The image is too large. Please resize the image (>20mb) and try again.");
                    }
                    else{
                        uploadFailed(" The image could not be saved");
                    }
                }
            }, function(evt) {
                /*progress*/
                $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            });
        };
    };
}]);

var loginModalInstanceCtrl = ['$scope', '$modalInstance', 'state', '$timeout', 'catsAPIservice',

                              function ($scope, $modalInstance, state, $timeout, catsAPIservice) {

    $scope.alerts = [];

    /* Handles user login attempts and password changes
     */
    $scope.login = function (form, email, password, newPassword, newPasswordRepeat, changePassword) {

        /* Flag to show the "required" fields only after a first save attempt */
        $scope.submitted = true;

        if (form.$invalid){
            loginAlert('Missing email or password');
            return;
        }

        if(changePassword){
            if(!newPassword || !newPasswordRepeat || newPassword != newPasswordRepeat){
                loginAlert('Both new passwords must be the same');
                return;
            }
        }

        /* Perform authentication */
        catsAPIservice.login(email, password)
        .success(function (response) {
            state.email = response.username;
            state.loggedin = true;

            /* Attempt change password */
            if(changePassword){
                var data = {"username": email, "password": newPassword, "role": response.role};
                catsAPIservice.updateUser(data)
                .success(function (response) {
                    loginSucccess("Password Changed");
                })
                .error(function (err) {
                    loginAlert('Password not changed');
                });
            }
            loginSucccess("Login succeeded");
        })
        .error(function (err) {
            loginAlert('Wrong user or password');
        });
    };

    /*
     * User status notifications
     */
    var loginSucccess = function(message) {

        $scope.alerts.push({type: 'success', msg: message, icon: 'glyphicon glyphicon-ok'});

        $timeout(function(){
            $scope.alerts.splice(0, 1);
            $modalInstance.close();
        }, 3000);
    };

    var loginAlert = function(message) {

        $scope.alerts.push({type: 'danger', msg: message,
            icon: 'glyphicon glyphicon-warning-sign'});
        $timeout(function(){
            $scope.alerts.splice(0, 1);
        }, 3000);
    };

    $scope.closeAlert = function(index) {

        $scope.alerts.splice(index, 1);
    };
}];

var ModalInstanceCtrl = ['$timeout', '$scope', '$modalInstance', 'catsAPIservice', 'state', 'vocabsArray',

                         function ($timeout, $scope, $modalInstance, catsAPIservice, state, vocabsArray) {

    $scope.artwork = {};
    $scope.mainTabs = { tabOneState : true};
    $scope.submitted = false;
    $scope.alerts = [];
    $scope.createAnother = false;

    /*Prepare an empty record*/
    var resetRecord = function() {

        $scope.record = {};
        /*Tabs require some initialization*/
        $scope.record.paintLayer = [{id: "1", layerType: "", paintBinder: [], colour: "",
            pigment: "", dye: "", active: true}];
        $scope.record.sampleAnalysis = [{id: "1", type: "", description:"", referenceNumber:"",
            date:"", employee:"", owner:"", originLocation:"",
            location:"", results:"", active: true}];
//      $scope.record.images = [{name: "kms4250", description: " a landscape", url: "http://cspic.smk.dk/globus/GLOBUS%202005/Globus%20Februar%202005/KMS4250.jpg"},
//      {name: "kms4245", description: "another landscape", url: "http://cspic.smk.dk/globus/40412628/img0572.jpg"}];
        $scope.record.images = [];
    };

    /* Update images whenever a new one is uploaded */
    $scope.$watch(
            // This is the listener function
            function() { return state.uploadedImage; },
            // This is the change handler
            function(newValue, oldValue) {
                if ( newValue !== oldValue ) {
                    $scope.record.images.push(state.uploadedImage);
                }
            }
    );

    /* Remove image reference if requested */
    $scope.$watch(
            // This is the listener function
            function() { return state.deleteImage; },
            // This is the change handler
            function(newValue, oldValue) {
                if ( newValue !== oldValue ) {
                    $scope.record.images.splice(state.deleteImage.index, 1);
                }
            }
    );

    if(state.sample && state.sample._id) {
        /* Editing an existing record*/
        $scope.record = state.sample;
    }
    else {
        /* Registering a new record */
        resetRecord();
    }

    /* Read the vocabularies to the scope*/
    for (var i=0; i < vocabsArray.length; i++){
        $scope[vocabsArray[i].type] = vocabsArray[i].items;
    }

    /*
     * START tabs for paint layers
     */
    var setAllLayerTabsInactive = function() {

        angular.forEach($scope.record.paintLayer, function(paintLayer) {
            paintLayer.active = false;
        });
    };

    var addNewLayer = function() {

        var id = $scope.record.paintLayer.length + 1;
        var emptyLayer = {id: id, layerType: "", paintBinderbinder: [], colour: "",
                pigment: "", dye: "", active: true};

        $scope.record.paintLayer.push(emptyLayer);
    };

    $scope.addLayer = function () {

        setAllLayerTabsInactive();
        addNewLayer();
    };

    $scope.removeLayerTab = function (index) {

        $scope.record.paintLayer.splice(index, 1);
    };
    /* END tabs for paint layers */

    /*
     * START tabs for xray
     */
    var setAllXrayTabsInactive = function() {

        angular.forEach($scope.record.xrayGroup, function(xrayGroup) {
            xrayGroup.active = false;
        });
    };

    var addNewXray = function() {

        var id = $scope.record.xrayGroup.length + 1;
        var emptyXray = {id: id, kv: "", ma:"", time: "", focus: "", distance: "",
                filter: "", test: false, active: true};

        $scope.record.xrayGroup.push(emptyXray);
    };

    $scope.addXray = function () {

        setAllXrayTabsInactive();
        addNewXray();
    };

    $scope.removeXrayTab = function (index) {

        $scope.record.xrayGroup.splice(index, 1);
    };
    /* END tabs for Xray */

    /*
     * START tabs for analysis
     */
    var setAllAnalysisInactive = function() {

        angular.forEach($scope.record.sampleAnalysis, function(sampleAnalysis) {
            sampleAnalysis.active = false;
        });
    };

    var addNewAnalysis = function() {

        var id = $scope.record.sampleAnalysis.length + 1;
        var emptyAnalysis = {id: id, sampleAnalysisType: "", sampleAnalysisDescription:"",
                active: true};

        $scope.record.sampleAnalysis.push(emptyAnalysis);
    };

    $scope.addAnalysis = function () {

        setAllAnalysisInactive();
        addNewAnalysis();
    };

    $scope.removeAnalysisTab = function (index) {

        $scope.record.sampleAnalysis.splice(index, 1);
    };
    /* END tabs for analysis */

    /* This function is used for testing, if the button is enabled in search.jade (ng-show="true")
     * then we can clear artworks
     * */
    $scope.clearArtwork = function () {

        $scope.record.artwork = {};
    };

    /* This function is used for testing, if the button is enabled in search.jade (ng-show="true")
     * then we can save artworks without associating them with a sample.
     * */
    $scope.addArtwork = function (artwork) {

        catsAPIservice.createArtwork(artwork)
        .success(function (response) {
            alert('Artwork saved');
        })
        .error(function (err) {
            alert(err);
        });
    };

    /*
     * User status notifications
     */
    var invalidAlert = function() {

        $scope.alerts.push({type: 'danger', msg: 'Save failed. Please correct the highlighted ' +
            'fields and try again.', icon: 'glyphicon glyphicon-warning-sign'});
        $timeout(function(){
            $scope.alerts.splice(0, 1);
        }, 5000);
    };

    var saveFailed = function(message) {

        $scope.alerts.push({type: 'danger', msg: message, icon: 'glyphicon glyphicon-warning-sign'});
        $timeout(function(){
            $scope.alerts.splice(0, 1);
        }, 5000);
    };

    var recordSaved = function(message) {

        $scope.alerts.push({type: 'success', msg: message, icon: 'glyphicon glyphicon-ok'});

        $timeout(function(){
            $scope.alerts.splice(0, 1);
            if ($scope.createAnother === false){
                $modalInstance.close();
            }
            else{
                /* clear the form */
                $scope.submitted = false;
                resetRecord();
                /* TODO: and the rest.... */
            }
        }, 3000);
    };

    $scope.closeAlert = function(index) {

        $scope.alerts.splice(index, 1);
    };

    /* Save a sample record to db*/
    var saveSample = function (record) {

        /* we copy to 'rec' because if we just use the original
         * ($scope.record) then the fields disappear immediately in the UI whilst the status
         * indicator times out.
         * */
        var rec = JSON.parse(JSON.stringify(record)); /*quick cheat to copy a simple json object*/

        catsAPIservice.createSample(rec)
        .success(function (response) {
            recordSaved('Record saved');
        })
        .error(function (err) {
            var message = "Save Sample failed ";
            message += (err) ? "(" + err + ")" : "";
            saveFailed(message);
        });
        state.searchRequested = true; /*refresh search results*/
    };

    /* Save an artwork record and a sample record to db
     * If the artwork save fails, the sample save is not attempted
     */
    var saveArtworkAndSample = function () {

        catsAPIservice.createArtwork($scope.record.artwork)
        .success(function (response) {
            /*add the id of artwork we've just created, or updated*/
            $scope.record.artwork._id = response._id;
            saveSample($scope.record);
        })
        .error(function (err) {
            var message = "Save Artwork & Sample failed ";
            message += (err) ? "(" + err + ")" : "";
            saveFailed(message);
        });
    }

    /*
     * This saves a sample record and optionally an artwork
     */
    $scope.register = function (formInvalid) {

        /* show required fields only after a save attempt */
        $scope.submitted = true;

        if (formInvalid){
            invalidAlert();
            /* the only required fields are on the first tab so move the user to it */
            $scope.mainTabs.tabOneState = true;
            return;
        }
        /* If there is an artwork with no _id, then it's not yet been saved in CATS db*/
        if ($scope.record.artwork && !$scope.record.artwork._id){
            saveArtworkAndSample();
        }else{
            saveSample($scope.record);
        }
    };

    /* Handle exit buttons */
    $scope.ok = function () {

        $modalInstance.close();
        state.searchRequested = true;
    };

    $scope.cancel = function () {

        $modalInstance.dismiss('cancel');
        state.searchRequested = true;
    };
}];

var CarouselImageCtrl = ['$scope', 'state',

                         function ($scope, state) {

    $scope.showImages = false;
    $scope.myInterval = -1;

    var slides = $scope.slides = [];

    /* Update images whenever search result index changes*/
    $scope.$watch(
            // This is the listener function
            function() { return state.itemIndex; },
            // This is the change handler
            function(newValue, oldValue) {
                if ( newValue !== oldValue ) {
                    loadSlides(newValue);
                }
            }
    );

    /*just for testing*/
//  $scope.addSlide = function() {
//  var notVeryRandomKittenNumber = 600 + slides.length;
//  slides.push({
//  image: 'http://placekitten.com/' + notVeryRandomKittenNumber + '/600',
//  text: 'cats'
//  });
//  };

    $scope.addArtworkSlide = function(invNum, externalurl, title) {
        var width = 600,
            imageurl,
            smkInternal = 'http://cspic.smk.dk/';
        if (externalurl.indexOf(smkInternal) !== -1){
            imageurl = externalurl.replace(smkInternal, 'https://catsdb.smk.dk/cspic/?pic=')
                       + "&mode=width&width=" + width;
        } else {
            imageurl = imageurl + "?mode=width&width=" + width;
        }

        slides.push({
            title: invNum,
            image: imageurl,
            text: title
        });
    };

    var loadSlides = function (index) {

        slides = $scope.slides = [];
        var sample = state.searchResultsPage[index];

        /*add artwork image*/
        if(sample && sample.artwork && sample.artwork.externalurl){
            $scope.addArtworkSlide(sample.artwork.inventoryNum,
                    sample.artwork.externalurl,
                    sample.artwork.title);
        }

        /*add other images*/
        if(sample && sample.images){
            angular.forEach(sample.images, function(image) {
                var width = 600,
                    imageurl,
                    smkInternal = 'http://cspic.smk.dk/';
                if (image.url.indexOf(smkInternal) !== -1){
                    imageurl = image.url.replace(smkInternal, 'https://catsdb.smk.dk/cspic/?pic=')
                               + "&mode=width&width=" + width;
                } else {
                    imageurl = image.url + "?mode=width&width=" + width;
                }
//                var imageurl = image.url.replace('http://cspic.smk.dk/', 'http://cspic.smk.dk/?pic=')
//                + "&mode=width&width=600";
                slides.push({
                    title: image.name,
                    image: imageurl,
                    text: image.description
                });
            });
        }

        if(slides.length > 0){
            $scope.showImages = true;
        }
    };

    loadSlides(state.itemIndex);

    /*just for test*/
//  for (var i=0; i<4; i++) {
//  $scope.addSlide();
//  }
}];

var ImageUploadCtrl = ['$scope',

                       function ($scope) {

    $scope.data = 'none';

    $scope.add = function(){
        var f = document.getElementById('file').files[0],
        r = new FileReader();
        r.onloadend = function(e){
            $scope.data = e.target.result;
        }
        r.readAsBinaryString(f);
    }
}];
