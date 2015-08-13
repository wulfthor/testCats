angular.module('ui.catsmultiselect', [ 'catsmultiselect.tpl.html', 'ui.bootstrap'])

  //from bootstrap-ui typeahead parser
  .factory('catsoptionParser', ['$parse', function ($parse) {
    //  ^        start of line
	//  \s*     zero or more whitespace
	//	(.*?)   group of any characters together (the whole string) array 1
	//	(?: starts a non-capturing group - so this won't be captured in the array
	//  (?:\s+as\s+(.*?))?   this ignores " as _label_"	
	//  (?:\s+group\s+by\s+\  this ignores the group by clause
	//  \s+for\s+   matches " for "
	//  (?:([\$\w][\$\w\d]*)) matches the item name
	 
	//                     0000011111022222222000000000000000000000033333000000000000004444444444444444000000000055550
	var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s(.*?))?(?:\s+group\s+by\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

    return {
    	parse: function (input) {
    		
    		// https://gist.github.com/guillaume86/5638205   
    		// angular-bootstrap-typeahead.js    		

    		var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source, vocabName;
    		if (!match) {
    			throw new Error(
    					"Expected typeahead specification in form of '_modelValue_ (_translation_)? (group by _group_)? for _item_ in _collection_'" +
    					" but got '" + input + "'.");
    		}
    		//$parse converts an Angular expression into a function (think "getter")
    		return {
    			itemName: match[4],             //the alias for the item
    			grpName: match[3],              //the alias of the group
    			vocabName: match[5],
    			source: $parse(match[5]),       //the source list of objects for the select
    			viewMapper: $parse(match[1]),   //main label
    			modelMapper: $parse(match[2]),  //danish translation
    			groupMapper: $parse(match[4] + '.' + match[3])   //group
    		};
    	}
    };
  }])
  .factory('vocabService', ['$http', function ($http) {
       return {
           updateVocab : function(type, item) {
               return $http({
                   url : 'vocab/' + type + '/items',
                   method : "POST",
                   data : item,
                   headers : {
                       'Content-Type' : 'application/json'
                   }
               });
           },
           getVocab : function(type) {
               var url = "vocab/" + type;
               return $http.get(url);
           },
           loggedin : function() {
               var url = "/loggedin";
               return $http.get(url);
           }
      };
   }])
   .factory("multistate", [ function() {
    'use strict';
    var multistate = {};

    return {
        multistate : multistate,
    };
   }])

  .directive('catsmultiselect', ['$parse', '$document', '$compile', '$interpolate', 'catsoptionParser', 'multistate', 'vocabService',

    function ($parse, $document, $compile, $interpolate, catsoptionParser, multistate, vocabService) {
      return {
        restrict: 'E',
        require: 'ngModel',
        /* code put in 'link' will run after compilation
         * 'scope' is the same as '$scope'. OriginalScope is that passsed from the parent controller.
         * When a directive requires a controller, it receives that controller as the fourth argument
         * of its link function (modelCtrl). This code is called for each catsmultiselect directive, 
         * modelCtrl.$modelValue is the values from the stored vocabulary identified by ng-model    .
         *  */
        link: function (originalScope, element, attrs, modelCtrl) {

          var exp = attrs.options,
            parsedResult = catsoptionParser.parse(exp),
            isMultiple = attrs.multiple ? true : false,
            required = false,
            scope = originalScope.$new(),
            changeHandler = attrs.change || angular.noop;

          scope.items = [];
          scope.groups = [];
          scope.header = 'Select';
          scope.multiple = isMultiple;
          scope.disabled = false;
          
          /*initialise login state*/
          vocabService.loggedin().success(function (response) {
              scope.userRole = (response == "0") ? false : response.role;
          }).error(function (err) {
              scope.userRole = false;
          });

          originalScope.$on('$destroy', function () {
            scope.$destroy();
          });

          var popUpEl = angular.element('<catsmultiselect-popup></catsmultiselect-popup>');

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

          //watch single/multiple state for dynamically change single to multiple
          scope.$watch(function () {
            return $parse(attrs.multiple)(originalScope);
          }, function (newVal) {
            isMultiple = newVal || false;
          });

          //watch option changes for options that are populated dynamically
          //disabled by CPO
          scope.$watch(function () {
            return parsedResult.source(originalScope);
          }, function (newVal) {
            if (angular.isDefined(newVal))
              parseModel();
          }, true);

          /*watch model change : the modelValue is the saved (selected vocabs) ngModel for that 
            particular multiselect instance*/
          scope.$watch(function () {
            return modelCtrl.$modelValue;
          }, function (newVal, oldVal) {
            //when directive initialize, newVal usually undefined. Also, if model value already set in the controller
            //for preselected list then we need to mark checked in our scope item. But we don't want to do this every time
            //model changes. We need to do this only if it is done outside directive scope, from controller, for example.
            if (angular.isDefined(newVal)) {
              markChecked(newVal);
              scope.$eval(changeHandler);
            }
            getHeaderText();
            modelCtrl.$setValidity('required', scope.valid());
          }, true);
            
          function parseModel() {
            scope.items.length = 0;
            scope.groups.length = 0;
            var model = parsedResult.source(originalScope);
            scope.groups.name = parsedResult.vocabName;

            if(!angular.isDefined(model)) return;
            
            for (var i = 0; i < model.length; i++) {
                var local = {};
                local[parsedResult.itemName] = model[i];
            	var grpName = parsedResult.groupMapper(local);
            	
            	if (!grpName){ 
            		grpName = ''; //create an empty group for orphans
            		local[parsedResult.itemName][parsedResult.grpName] = grpName;
            	}
            	
            	var grpIndex = -1;
            	
            	//indexOf this group
            	for(var ix = 0, len = scope.groups.length; ix < len; ix++) {
            	    if (scope.groups[ix].name === grpName) {
            	    	grpIndex = ix;
            	        break;
            	    }
            	}
            	//create new group
            	if (grpIndex < 0 ){
            		var grp = {name: "", items: []};
            		grp.name = grpName;
            		grpIndex = scope.groups.push(grp) - 1;
            		//scope.groups[grpIndex].items = [];
            	}
            	var name = parsedResult.viewMapper(local);
            	var tag = name; //= parsedResult.viewMapper(local);
            	var secondary = parsedResult.modelMapper(local);
            	if(secondary) {
            		tag += " (" + secondary + ")";
            	}
            	
            	/*if a new vocab is added ensure checked status is not lost*/
            	var checked = false;
                angular.forEach(modelCtrl.$modelValue, function (val) {
                    if (angular.equals(model[i], val)) {
                      checked = true;
                    }
                });
                    
            	//add item
                scope.groups[grpIndex].items.push({
                  groupName: grpName,
                  name: name,
                  secondary: secondary,
                  label: tag,
                  model: model[i],
                  checked: checked,
                  group: parsedResult.groupMapper(local)
                });
            }
            /*sort the vocabularies alphabetically after name*/
            scope.groups.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );
            for(var ii = 0; ii < scope.groups.length; ii++) {
                scope.groups[ii].items.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );
            }
          }

          parseModel();

          element.append($compile(popUpEl)(scope));

          function getHeaderText() {
            if (is_empty(modelCtrl.$modelValue)) return scope.header = attrs.msHeader || 'Select';

              if (isMultiple) {
//                  if (attrs.msSelected) {
                  //    scope.header = $interpolate(attrs.msSelected)(scope);
                	  scope.header = "";
                	  for (i=0; modelCtrl.$modelValue.length > i;i++){
                		  scope.header += modelCtrl.$modelValue[i].name;
                		  if(modelCtrl.$modelValue.length > i + 1) {scope.header += ", "}
                	  }
//                  } else {
//                      scope.header = modelCtrl.$modelValue.length + ' ' + 'selected';
//                  }

            } else {
              var local = {};
              local[parsedResult.itemName] = modelCtrl.$modelValue;
              scope.header = parsedResult.viewMapper(local);
            }
          }

          function is_empty(obj) {
            if (!obj) return true;
            if (obj.length && obj.length > 0) return false;
            for (var prop in obj) if (obj[prop]) return false;
            return true;
          };

          scope.valid = function validModel() {
            if(!required) return true;
            var value = modelCtrl.$modelValue;
            return (angular.isArray(value) && value.length > 0) || (!angular.isArray(value) 
                    && value != null && value != "");
          };

          function selectSingle(item) {
            if (item.checked) {
              scope.uncheckAll();
            } else {
              scope.uncheckAll();
              item.checked = !item.checked;
            }
            setModelValue(false);
          }

          function selectMultiple(item) {
            item.checked = !item.checked;
            setModelValue(true);
          }

          function setModelValue(isMultiple) {
            var value;

            if (isMultiple) {
              value = [];
              angular.forEach(scope.groups, function (group) {
                angular.forEach(group.items, function (item) {
                    if (item.checked) value.push(item.model);
                })
              })
            } else {
              angular.forEach(scope.groups, function (group) {
                  angular.forEach(group.items, function (item) {
                      if (item.checked) {
                        value = item.model;
                        return false;
                      }
                    })
                })
            }
            modelCtrl.$setViewValue(value);
          }

          function markChecked(newVal) {
            if (!angular.isArray(newVal)) {
              angular.forEach(scope.groups, function (group) {
                  angular.forEach(group.items, function (item) {
                      if (angular.equals(item.model, newVal)) {
                        item.checked = true;
                        return false;
                      }
                  });
              });
            } else {
              angular.forEach(scope.groups, function (group) {
                  angular.forEach(group.items, function (item) {
                      item.checked = false;
                      angular.forEach(newVal, function (i) {
                        if (angular.equals(item.model, i)) {
                          item.checked = true;
                        }
                      });
                  });
              });
            }
          }

          scope.updateVocabGroup = function (vocabGroup) {
              /* update the groups.items vocab group which was read into the multiselect
               * the list in the vocab editor is updated immediately by this*/
              var getter = parsedResult.source;
              var setter = getter.assign;
              setter(originalScope, vocabGroup);
          };

          scope.checkAll = function () {
            if (!isMultiple) return;
            angular.forEach(scope.groups, function (group) {
               angular.forEach(group.items, function (item) {
                 item.checked = true;
               });
            });
            setModelValue(true);
          };

          scope.uncheckAll = function () {
            angular.forEach(scope.groups, function (group) {
              angular.forEach(group.items, function (item) {
                item.checked = false;
              });
            });
            setModelValue(true);
          };

          scope.select = function (item) {
            if (isMultiple === false) {
              selectSingle(item);
              scope.toggleSelect();
            } else {
              selectMultiple(item);
            }
          }
        }
      };
    }])

  .directive('catsmultiselectPopup', ['$document', '$compile', 'multistate',

    function ($document, $compile, multistate) {
        return {
          restrict: 'E',
          scope: false,
          replace: true,
          templateUrl: 'catsmultiselect.tpl.html',
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
  }])

  .controller('ModalVocabCtrl', [ '$scope', '$modal', 'multistate', 

  function ($scope, $modal, multistate) {

      $scope.items = ['item1', 'item2', 'item3'];
 
      $scope.addItem = function () {
          var modalVocabInstanceCtrl =  $modal.open({
              size: 'lg',
              templateUrl:'catsvocab.tpl.html',
              controller: ModalVocabInstanceCtrl,
              resolve: {
                  groups: function () {
                      return $scope.$parent.groups;
                  },
                  pnt: function () {
                      return $scope.$parent;
                      //return $scope.$parent.groups;
                  }//,
                  //vocabService : vocabService
              } 
              
//          modalVocabInstanceCtrl.result.then(function (selectedItem) {
//            $scope.selected = selectedItem;
//          }, function () {
//           // $log.info('Modal dismissed at: ' + new Date());
//          });
        });
     }

      $scope.showEditButton = function () {
          /*This is not secure : a default user reading this could 
           *hack other vocabs - but this is acceptable as our logged
           *in users are unlikely to try this*/
          if ($scope.$parent.userRole == "admin"){
              return true;
          }
          else{
              /* TODO: re-factor when time allows. Really we should read the 'permissions'
               * from the vocabs and show the button accordingly*/
              if (($scope.groups.name == 'colours') ||
                  ($scope.groups.name == 'pigments') ||
                  ($scope.groups.name == 'binders') ||
                  ($scope.groups.name == 'dyes') ||
                  ($scope.groups.name == 'materials')) {
                  return true;
              }
              else{
                  return false;
              }
          }
     }
  }])
// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $modal service used above.

var ModalVocabInstanceCtrl = ['$scope', '$modalInstance', '$timeout', 'groups', 'vocabService', 'pnt',

function ($scope, $modalInstance, $timeout, groups, vocabService, pnt) {

  $scope.vocab = {};
  $scope.groups = groups;
  $scope.loading = false;
  $scope.alerts = [];

  $scope.ok = function () {
    $modalInstance.close();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
  
  var updateSuccess = function(message) {

      $scope.alerts.push({type: 'success', msg: message, icon: 'glyphicon glyphicon-ok'});

      $timeout(function(){
          $scope.alerts.splice(0, 1);
          $scope.vocab = {}; //restore list
      }, 3000);
  };
  
  var vocabAlert = function(message) {

      $scope.loading = false;
      $scope.alerts.push({type: 'danger', msg: message, icon: 'glyphicon glyphicon-warning-sign'});

      $timeout(function(){
          $scope.alerts.splice(0, 1);
      }, 3000);
  };
  
  $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
  };
  
  $scope.update = function (type) {
      /* Saves the value stored in scope 'vocab' to the vocabulary collection on mongo
       * and adds it to the list in the vocab editor popup 
       * */
      var item = {'item' : {'name': $scope.vocab.name,
                            'secondaryname': $scope.vocab.secName,
                            'grp': $scope.vocab.grpName
                           }
      };
      $scope.loading = true;
      /*save the new vocab to mongodb*/
      vocabService.updateVocab(type, item)
      .success(function (resp) {
          /*read the updated vocab group back from mongodb*/
          vocabService.getVocab(type)
          .success(function (response) {
              var vocabGroup = response[0].items.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );
              /*update the vocab editing popup list with the new value*/
              pnt.updateVocabGroup(vocabGroup);
              updateSuccess("Vocabulary updated successfully");
              $scope.loading = false;
          })
          .error(function (err) {
              vocabAlert('Reading vocabs failed!');
          });
      })
      .error(function (response) {
          vocabAlert('Updating vocabs failed!');
      })
  };
  
  $scope.updateInputs = function (vocab) {
//      $scope.selected = false;

      /* When vocab name is edited, check list to see if there's an exact match:
       * if there is, copy over the other fields*/
      
      for(var i=0;i<$scope.groups.length;i++){
          for(var ii=0;ii<$scope.groups[i].items.length;ii++){
              if($scope.groups[i].items[ii].name == vocab){
                  /*match found*/
                  $scope.vocab.secName = $scope.groups[i].items[ii].secondary;
                  $scope.vocab.grpName = $scope.groups[i].name;
//                  $scope.selected = true;
                  return;
              }
          }
      }
      $scope.vocab.secName = "";
      $scope.vocab.grpName = "";
      return;
  };
}];

angular.module('catsmultiselect.tpl.html', [])

  .run(['$templateCache', function($templateCache) {
    $templateCache.put('catsmultiselect.tpl.html',

      "<div class=\"btn-group\">\n" +
      "  <button type=\"button\" class=\"btn btn-default dropdown-toggle\" ng-click=\"toggleSelect()\" ng-disabled=\"disabled\" ng-class=\"{'has-error': !valid()}\">\n" +
//      "     popover=\"This field is required\", popover-placement=\"right\", popover-trigger=\"mouseenter\">\n" +
      "    {{header}} \n" +
//      "    {{header}} <span class=\"caret\"></span>\n" +  
      "  </button>\n" +
      "  <ul class=\"dropdown-menu\">\n" +
      "  <div class=\"row uigroup\">" +
      "    <div ng-show=\"multiple\" role=\"presentation\" class=\"col col-sm-8\">\n" +
      "      <button class=\"btn btn-link btn-xs\" ng-click=\"checkAll()\" type=\"button\"><i class=\"glyphicon glyphicon-ok\"></i> Check all</button>\n" +
      "      <button class=\"btn btn-link btn-xs\" ng-click=\"uncheckAll()\" type=\"button\"><i class=\"glyphicon glyphicon-remove\"></i> Uncheck all</button>\n" +
      "    </div>" +
//      "    <div ng-show=\"multiple\" role=\"presentation\" class=\"col col-sm-4\">\n" +
//      "      <button class=\"btn btn-link btn-xs\" ng-click=\"addItem()\" type=\"button\"><i class=\"glyphicon glyphicon-plus\"></i> New item </button>\n" +
//      "    </div>" +      
      "  </div>" +
      "  <div class=\"row uigroup\">" + 
      "    <div class=\"col col-sm-8\">\n" +
      "      <input class=\"form-control\" type=\"text\" ng-model=\"searchText.$\" autofocus=\"autofocus\" placeholder=\"Filter\" />\n" +
      "    </div>" +      
//      "    <div class=\"col col-sm-4\" ng-show= \"(groups | filter:searchText).length == 0\">\n" +
//      "       <button class=\"btn btn-default\" ng-click=\"addItem()\" type=\"button\"><i class=\"glyphicon glyphicon-plus\"></i> New </button>\n" +
          "<div ng-controller=\"ModalVocabCtrl\">\n" +
//          "    <div class=\"col col-sm-4\" ng-show= \"(groups | filter:searchText).length == 0\">\n" +
          "    <div class=\"col col-sm-4\">\n" +
          "       <button class=\"btn btn-default\" ng-show=\"showEditButton()\" ng-click=\"addItem()\" type=\"button\"><i class=\"glyphicon glyphicon-edit\"></i> Edit list </button>\n" +
          "    </div>\n" + 
      "    </div>" +
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
//      "        <a ng-click=\"select(i)\">\n" +
//      "          <i class=\"glyphicon\" ng-class=\"{'glyphicon-check': i.checked, 'glyphicon-unchecked': !i.checked}\"></i></a>\n" +
      "        <span> {{i.label}}</span>\n" +
      "       </label>" +
      "      </li>\n" +
      "    </ul>\n" +
      "    </div>" +    
      "  </div>" +      
      "  </ul>\n" +
      "</div>");
  }])
    
    .run(['$templateCache', function($templateCache) {

        $templateCache.put('catsvocab.tpl.html',

        "<div ng-include=\"\'catsvocab.tpl.html\'\">\n" + //otherwise it doesn't appear first click
        "    <script type=\"text/ng-template\" id=\"catsvocab.tpl.html\">\n" + 
        "        <div class=\"modal-header\">\n" + 
        "            <h3 class=\"modal-title\">Vocabulary Editor</h3>\n" + 
        "        </div>\n" + 
        "        <div class=\"modal-body\">\n" + 
        "          <table class=\"table\">\n" + 
        "            <h4> {{ groups.name }} </h4>\n" + 
        "            <thead>\n" + 
        "               <th> Preferred name </th>\n" +
        "               <th> Secondary name(s) </th>\n" +
        "               <th> Group </th>\n" +
        "               <th></th>\n" +
        "            </thead>\n" +
        "            <tbody>\n" +
        "              <tr>\n" +
        "                <td><input type=\"text\" ng-model=\"vocab.name\" ng-change=\"updateInputs(vocab.name)\" class=\"form-control\"></input></td>" +
        "                <td><input type=\"text\" ng-model=\"vocab.secName\" class=\"form-control\"></input></td>" +
        "                <td><input type=\"text\" ng-model=\"vocab.grpName\" class=\"form-control\"></input></td>" +
        "                <td><button class=\"btn btn-primary\" ng-disabled=\"!vocab.name\" ng-click=\"update(groups.name)\" ><i class=\"glyphicon glyphicon-save\"></i> Save</button></td>" + 
        "              </tr>\n" + 
        "            </tbody>\n" + 
        "            <tbody ng-repeat=\"group in groups | orderBy:items.name \">\n" +
        "              <tr ng-repeat=\"item in group.items | filter:vocab.name  \">\n" +
        "                <td> {{ item.name }} </td>" +
        "                <td> {{ item.secondary }} </td>" +
        "                <td> {{ group.name }} </td>" +
        "                <td><i class=\"glyphicon glyphicon-ok\" ng-show=\"vocab.name == item.name\"></i> </td>" +
        "              </tr>\n" + 
        "            </tbody>\n" + 
        "          </table>\n" + 
        "          <alert ng-repeat=\"alert in alerts\" type=\"{{alert.type}}\" close=\"closeAlert($index)\" class=\"animation\"><i class=\"{{alert.icon}}\"></i> {{alert.msg}}</alert>" +
        "        </div>\n" + 
        "        <div class=\"modal-footer\">\n" + 
        "         <img class=\"spinner\" ng-show=\"loading\" src=\"images/ajax-loader.gif \"></img>" +
        "            <button class=\"btn btn-primary\" ng-click=\"ok()\">Close</button>\n" + 
      //"            <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n" + 
        "        </div>\n" + 
        "    </script>\n" +
        "</div>\n" 
        );
  }]);
