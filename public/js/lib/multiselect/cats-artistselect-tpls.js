angular.module('ui.catsartistselect', ['catsartistselect.tpl.html'])
   .factory('apiService', ['$http', function ($http) {

       return {
           getCorpusArtworkById : function(id) {
               var url = "searchsmk?id=" + id;
               return $http.get(url);
           },
           getCatsArtworkById : function(id) {
               var url = "artwork?invNum=" + id;
               return $http.get(url);
           }
       };
   }])
   .directive('catsartistselect', ['$http', '$parse', '$document', '$compile', '$interpolate', 'apiService', '$timeout',
                                   function ($http, $parse, $document, $compile, $interpolate, apiService, $timeout) {
       return {
           restrict: 'E',
           require: 'ngModel',
           /*Use the controller for ngModel directive ('ngModelController').
             This particular controller will enable us to set the value using $setViewValue.
             The controller is passed as the 4th argument to the linking function  */
           link: function (originalScope, element, attrs, modelCtrl) {
               /*link is used instead of a controller*/
               var exp = attrs.options,
                   required = false,
                   scope = originalScope.$new(), /*creates a child scope*/
                   changeHandler = attrs.change || angular.noop;

               /*'scope' in link is the same as '$scope' in a controller*/
               scope.items = [];
               scope.groups = [];
               scope.disabled = false;
               scope.loading = false;
               scope.showSMKSearch = false;

               /* As search box doubles as Inventory Number, we need to explicitly
                * set the existing value */
               var existingArtwork = scope.$eval(attrs.ngModel);
               if (existingArtwork && existingArtwork.inventoryNum){
                   scope.searchText = existingArtwork.inventoryNum;
               }

               originalScope.$on('$destroy', function () {
                   scope.$destroy();
               });

               var popUpEl = angular.element('<catsartistselect-popup></catsartistselect-popup>');

               //required validator
               if (attrs.required || attrs.ngRequired) {
                   required = true;
               }
               attrs.$observe('required', function(newVal) {
                   required = newVal;
               });

               //watch disabled state
               scope.$watch(function () {
                   return $parse(attrs.disabled)(originalScope);
               }, function (newVal) {
                   scope.disabled = newVal;
               });

               element.append($compile(popUpEl)(scope));

               function is_empty(obj) {
                   if (!obj) return true;
                   if (obj.length && obj.length > 0) return false;
                   for (var prop in obj) if (obj[prop]) return false;
                   return true;
               };

               scope.valid = function validModel() {
                   if(!required) return true;
                   var value = modelCtrl.$modelValue;
                   return (angular.isArray(value) && value.length > 0) ||
                          (!angular.isArray(value) && value != null);
               };

               /*select() is called when a checkbox is clicked*/
               scope.select = function (item) {
                   var value;
                   if (!item.checked) {
                       /*make true, could be undefined*/
                       item.checked = !item.checked;
                   }
                   angular.forEach(scope.groups, function (group) {
                       angular.forEach(group.items, function (item) {
                           if (item.checked) {
                               value = item.model;
                               return false; //leave forEach
                           }
                       })
                   })
                   modelCtrl.$setViewValue(value);

                   //attempt to fix updating artwork
//                   originalScope.$apply(function() {
//                       modelCtrl.$setViewValue(value);
//                   });
                   scope.toggleSelect();
               };

               scope.cancel = function (item) {
                   scope.cancelled = true;
                   scope.toggleSelect();
               };

               getSMK = function (id) {
                   apiService.getCorpusArtworkById(id)
                   .success(function (resp) {
                       scope.loading = false; /*hide spinner*/
                       scope.resultText = "";
                       var artwork = {};
                       var solrResp = resp.response;
                       if (solrResp.numFound === 1){ /*there can be only one*/
                           var doc = solrResp.docs[0];
                           artwork.corpusId = doc.csid;
                           artwork.externalurl = doc.externalurl;
                           artwork.inventoryNum = doc.id_s;
                           artwork.title = doc.title_first;
                           var earliest = new Date(doc.object_production_date_earliest);

                           artwork.productionDateEarliest = (doc.object_production_date_earliest) ?
                                                          doc.object_production_date_earliest.substring(0,10) : ""; /*date only*/
                           artwork.productionDateLatest = (doc.object_production_date_latest) ?
                                                           doc.object_production_date_latest.substring(0,10) : "";
                           artwork.artist = doc.artists_data.replace(/;-;/g,', ');
                           artwork.dimensions = doc.dimension_netto;
                           artwork.nationality = doc.artists_natio.replace(/;-;/g,', ');
                           artwork.technique = doc.prod_technique;
                           artwork.owner = doc.owner;

                       }else if (solrResp.numFound === 0){
                           scope.resultText = "No SMK records found";
                       }else{
                           scope.resultText = "More than one SMK record found. Not good.";
                       }
                       if (artwork && artwork.inventoryNum){
                           scope.groups[scope.groups.length] =
                           {name:"Results from Corpus",
                                   items:[{label:artwork.inventoryNum + " " + artwork.title,
                                       model:artwork}]
                           };
                       }
                   })
                   .error(function (response) {
                       scope.loading = false; /*hide spinner*/
                       scope.resultText = "The SMK server is unavailable";
                   })
               };

               scope.searchSmk = function (id) {
                   scope.loading = true; /*show spinner*/
                   scope.groups = [];
                   scope.resultText = "Searching SMK...";
                   /* adding some time here enables us to check the "loading" icon*/
                   /* hint: wrapping first argument as 'function' allows passing the id parameter*/
                   $timeout(function() {getSMK(id)}, 1000);
               }

               getCats = function (id) {
                   apiService.getCatsArtworkById(id)
                   .success(function (resp) {
                       scope.loading = false; /*hide spinner*/
                       var artwork = resp;
                       if (artwork){
                           /* if result is from CATS, save artist_id
                            * used to determine update or create : TODO:too early could be more
                            * than one
                            */
                           //scope.artworkId = artwork.rows[0].artwork_id;

                           /* copy the record to groups : this will populate the list shown to the user*/
                           scope.groups = [{name:  "Results from CATS", items:[]}];
                           for(i=0;i < artwork.length;i++){
                               var record = artwork[i];
                               scope.groups[0].items[i] = {label:record.inventoryNum + " " +  record.title,
                                       model:record
                               }
                           }
                           if(artwork.length === 0){
                               scope.resultText = "No records found";
                               scope.showSMKSearch = true;
                           }else{
                               scope.resultText = "";
                           }
                       }
                   })
                   .error(function (response) {
                       scope.loading = false; /*hide spinner*/
                       scope.resultText = "Failed to connect to CATS database";
                       //  parseModel();
                   })
               };

               scope.searchCats = function (id) {
                   scope.toggleSelect();
                   scope.loading = true; /*show spinner*/
                   scope.groups = [];    /*reset results*/
                   scope.resultText = "Searching CATS...";

                       /* adding some time here enables us to check the "loading" icon*/
                   /* hint: wrapping first argument as 'function' allows passing the id parameter*/
                   $timeout(function() {getCats(id)}, 1000);

               };

               scope.change = function () {

                   /* Every time the inventory number changes, make sure it's
                    * reflected. And reset all the other fields, so a user cannot change
                    * an inventory number once the artwork has an _id.
                    * */
                   var value = {};
                   value.inventoryNum = scope.searchText;
                   modelCtrl.$setViewValue(value);

                   scope.closeSelect();
                   scope.showSMKSearch = false;
               }
           }
       }
   }])

   .directive('catsartistselectPopup', ['$document', function ($document) {
       return {
           restrict: 'E',
           scope: false,
           replace: true,
           templateUrl: 'catsartistselect.tpl.html',
           link: function (scope, element, attrs) {

               scope.isVisible = false;

               scope.toggleSelect = function () {
                   if (element.hasClass('open')) {
                       element.removeClass('open');
                       $document.unbind('click', clickHandler);
                   } else {
                       element.addClass('open');
                       $document.bind('click', clickHandler);
                       scope.focus();
                   }
               };

               scope.closeSelect = function () {
                   if (element.hasClass('open')) {
                       element.removeClass('open');
                       $document.unbind('click', clickHandler);
                   }
               };

               /*click 'search' or 'searchsmk'*/
               function clickHandler(event) {
                   if (elementMatchesAnyInArray(event.target, element.find(event.target.tagName)))
                       return;
                   element.removeClass('open');
                   $document.unbind('click', clickHandler);
                   scope.$apply();
               }

               scope.focus = function focus(){
                   var searchBox = element.find('input')[0];
                   searchBox.focus();
               }

               var elementMatchesAnyInArray = function (element, elementArray) {
                   for (var i = 0; i < elementArray.length; i++)
                       if (element == elementArray[i])
                           return true;
                   return false;
               }
           }
       }
   }]);

angular.module('catsartistselect.tpl.html', [])

.run(['$templateCache', function($templateCache) {
    $templateCache.put('catsartistselect.tpl.html',

            "<div class=\"btn-group\">\n" +
            "  <div class=\"input-group\">" +
            "  <input class=\"searchInput form-control\" ng-change=\"change()\" ng-model=\"searchText\" type=\"text\" placeholder=\"Inventory number\">\n" +
            "  <span class=\"input-group-btn\">" +
            "    <button type=\"button\" class=\"btn btn-default\" ng-click=\"searchCats(searchText)\" ng-disabled=\"disabled\" ng-class=\"{'error': !valid()}\">\n" +
            "      <i class=\"glyphicon glyphicon-search\"></i>\n" +
            "    </button>\n" +
            "  </span>" +
            "  </div>" +
            "  <ul class=\"dropdown-menu\">\n" +
            "  <div class=\"row uigroup\">" +
            "  </div>" +
            "  <div class=\"row uigroup\">" +
            "    <div class=\"col col-sm-1\">\n" +
            "    </div>" +
            "    <div class=\"col col-sm-10\">\n" +
            "    <ul ng-repeat=\"g in groups | filter:searchText\">\n" +
            "       <label ng-show=\"g.name != false\">" +
            "        {{g.name}}\n" +
            "       </label>" +
            "      <li ng-repeat=\"i in g.items | filter:searchText\">\n" +
            "       <label style=\"font-weight: normal\">" +
            "        <input type=\"checkbox\" ng-disabled=\"empty\" ng-checked=\"i.checked\" ng-click=\"select(i)	\"/>" +
//          "        <a ng-click=\"select(i)\">\n" +
//          "          <i class=\"glyphicon\" ng-class=\"{'glyphicon-check': i.checked, 'glyphicon-unchecked': !i.checked}\"></i></a>\n" +
            "        <span> {{i.label}}</span>\n" +
            "       </label>" +
            "      </li>\n" +
            "    </ul>\n" +
            "    </div>" +
            "  </div>" +
            "  <div ng-show=\"resultText\" class=\"row uigroup\">" +
//          "    <div class=\"col col-sm-8\">\n" +
//          "      <input class=\"form-control\" type=\"text\" ng-model=\"searchText.$\" autofocus=\"autofocus\" placeholder=\"Filter\" />\n" +
//          "    </div>" +
//            "    <div class=\"col col-sm-12\" ng-show= \"(groups | filter:searchText).length == 0\">\n" +
            "        <div class=\"col col-sm-1\"></div>" +
            "        <div class=\"col col-sm-10\">\n" +
            "          <label style=\"font-weight: normal\">" +
            "            {{resultText}}\n" +
            "          </label>" +
            "        </div>" +
            "   </div>" +
            "  <div class=\"row uigroup\">" +
            "    <div class=\"col col-sm-12\">\n" +
            "      <div class=\"modal-footer\">" +
            "         <img class=\"spinner\" ng-show=\"loading\" src=\"images/ajax-loader.gif \"></img>" +
            "         <button class=\"btn btn-primary\" ng-show=\"showSMKSearch\" ng-click=\"searchSmk(searchText)\" type=\"button\"><i class=\"glyphicon glyphicon-search\"></i> Search SMK </button>\n" +
            "         <button class=\"btn btn-warning\" ng-click=\"cancel()\" type=\"button\"><i class=\"glyphicon glyphicon-ban-circle\"></i> Cancel </button>\n" +
            "      </div>" +
            "   </div>" +
            "  </div>" +
            "  </ul>\n" +
    "</div>");
}]);
