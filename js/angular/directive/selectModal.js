/**
 * Presents existing item-select controls in a searchable Ionic modal without
 * changing their native select or Angular model contract.
 */
IonicModule.directive('select', ['$ionicModal', '$timeout', function($ionicModal, $timeout) {
  var uid = 0;

  return {
    restrict: 'E',
    link: function(scope, element) {
      var select = element[0];
      var container = select.parentNode;
      var modal;
      var modalScope;
      var display;
      var displayValue;
      var displayId;
      var observer;
      var opening = false;

      if (!container || !container.classList.contains('item-select') || select.multiple) {
        return;
      }

      displayId = 'modernSelectDisplay' + (++uid);
      display = angular.element(
        '<button type="button" id="' + displayId + '" class="modern-select-display" aria-haspopup="dialog">' +
          '<span class="modern-select-display-value"></span>' +
          '<span class="modern-select-display-action" aria-hidden="true">' +
            '<i class="icon ion-chevron-down"></i>' +
          '</span>' +
        '</button>'
      );
      displayValue = display[0].querySelector('.modern-select-display-value');

      element.addClass('modern-select-native');
      element.attr('aria-hidden', 'true');
      element.attr('tabindex', '-1');
      angular.element(container).addClass('modern-select-enhanced');
      container.insertBefore(display[0], select.nextSibling);

      if (container.tagName === 'LABEL') {
        // O markup padrao deste item e um <label class="item-select"> envolvendo
        // o <select> diretamente - sem um "for" explicito, o proprio browser
        // associa esse label ao select automaticamente (HTMLLabelElement.control),
        // por ser o unico elemento "labelable" ali dentro. O ionic.tap (tap.js)
        // sobe a arvore a partir de qualquer toque dentro do label procurando
        // essa associacao (tapContainingElement/tapTargetElement) e, ao resolver
        // o <select>, chama ele.focus() direto nele (tapHandleFocus - "trick to
        // force Android options to show up"). No Android esse focus() "descasado"
        // (disparado ao tocar em outro elemento) e ignorado, mas no iOS/WKWebView
        // ele abre o picker nativo mesmo assim - causa raiz do item-select ainda
        // abrindo o seletor nativo so no iOS. Apontar o "for" pro botao visivel
        // quebra essa associacao implicita: o label passa a "pertencer" ao botao,
        // nunca mais ao select escondido, em qualquer plataforma.
        container.setAttribute('for', displayId);
      }

      function getTitle() {
        var label = container.querySelector('.input-label');
        var text = label && label.textContent.replace(/^\s+|\s+$/g, '');
        return text || select.getAttribute('aria-label') || 'Selecionar opcao';
      }

      function getPlaceholder() {
        return select.getAttribute('placeholder') || 'Selecionar...';
      }

      function getOptionText(option) {
        var text = option.textContent.replace(/^\s+|\s+$/g, '');
        return text || (option.value === '' ? getPlaceholder() : option.value);
      }

      function readGroups() {
        var groups = [];
        var groupsByLabel = {};
        var options = select.options;
        var i;
        var option;
        var parent;
        var label;
        var key;
        var group;

        for (i = 0; i < options.length; i++) {
          option = options[i];
          if (option.value === '?') {
            continue;
          }
          parent = option.parentNode;
          label = parent && parent.tagName === 'OPTGROUP' ? parent.label : '';
          key = label || '__ungrouped__';
          group = groupsByLabel[key];

          if (!group) {
            group = groupsByLabel[key] = { label: label, options: [] };
            groups.push(group);
          }

          group.options.push({
            index: i,
            text: getOptionText(option),
            disabled: option.disabled || (parent && parent.disabled),
            selected: option.selected
          });
        }

        return groups;
      }

      function filterGroups() {
        var query = (modalScope.search.query || '').toLowerCase();
        var filtered = [];

        angular.forEach(modalScope.groups, function(group) {
          var options = [];
          angular.forEach(group.options, function(option) {
            if (!query || option.text.toLowerCase().indexOf(query) !== -1) {
              options.push(option);
            }
          });
          if (options.length) {
            filtered.push({ label: group.label, options: options });
          }
        });

        modalScope.filteredGroups = filtered;
      }

      function syncDisplay() {
        var option = select.options[select.selectedIndex];
        var title = getTitle();

        displayValue.textContent = option ? getOptionText(option) : getPlaceholder();
        display.toggleClass('is-placeholder', !option || (option.value === '' && !option.textContent.trim()));
        display.attr('aria-label', title + ': ' + displayValue.textContent);
        display[0].disabled = select.disabled;
        angular.element(container).toggleClass('item-select-disabled', select.disabled);
      }

      function createModal() {
        modal = $ionicModal.fromTemplate(
          '<ion-modal-view class="modern-select-modal">' +
            '<ion-header-bar class="bar-positive modern-select-modal-header">' +
              '<h1 class="title">{{title}}</h1>' +
              '<button type="button" class="button button-icon ion-close-round" ' +
                'aria-label="Fechar" ng-click="close()"></button>' +
            '</ion-header-bar>' +
            '<ion-content class="has-header modern-select-modal-content">' +
              '<div class="modern-select-search">' +
                '<i class="icon ion-ios-search-strong" aria-hidden="true"></i>' +
                '<input type="search" placeholder="Filtrar op&ccedil;&otilde;es" aria-label="Filtrar op&ccedil;&otilde;es" ' +
                  'ng-model="search.query" ng-change="filter()">' +
              '</div>' +
              '<div class="modern-select-empty" ng-if="!filteredGroups.length">Nenhuma op&ccedil;&atilde;o encontrada</div>' +
              '<div class="modern-select-options" ng-repeat="group in filteredGroups">' +
                '<div class="item item-divider" ng-if="group.label">{{group.label}}</div>' +
                '<button type="button" class="item modern-select-option" ' +
                  'ng-repeat="option in group.options" ng-disabled="option.disabled" ' +
                  'ng-class="{selected: option.selected}" ng-click="choose(option)">' +
                  '<span>{{option.text}}</span>' +
                  '<i class="icon ion-checkmark-round" aria-hidden="true" ng-if="option.selected"></i>' +
                '</button>' +
              '</div>' +
            '</ion-content>' +
          '</ion-modal-view>',
          {
            animation: 'slide-in-up',
            focusFirstInput: true,
            backdropClickToClose: true
          }
        );
        modalScope = modal.scope;
        modalScope.close = function() {
          modal.hide();
        };
        modalScope.search = { query: '' };
        modalScope.filter = filterGroups;
        modalScope.choose = function(option) {
          if (option.disabled) {
            return;
          }
          modal.hide();
          $timeout(function() {
            select.selectedIndex = option.index;
            element.triggerHandler('change');
            syncDisplay();
          }, 0, false);
        };
      }

      function open(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (select.disabled || opening || (modal && modal.isShown())) {
          return;
        }
        if (!modal) {
          createModal();
        }

        opening = true;
        modalScope.title = getTitle();
        modalScope.search.query = '';
        modalScope.groups = readGroups();
        filterGroups();
        modal.show().then(function() {
          opening = false;
        }, function() {
          // Se a promise de exibicao for rejeitada (ex.: scope destruido no meio
          // da animacao), a flag precisa ser liberada aqui tambem - sem isso o
          // select para de responder a clique permanentemente.
          opening = false;
        });
      }

      function preventNativeFocus(event) {
        // O ionic.tap (js/utils/tap.js) ignora deliberadamente o proprio
        // sistema de toque quando o alvo e um <select> e, no Android, ate
        // forca foco nele para abrir o picker nativo. Isso acontece no
        // mousedown/touchstart, antes do 'click' - bloquear soh o preventDefault
        // aqui evita o picker nativo sem impedir o 'click' que abre o modal.
        if (!select.disabled) {
          event.preventDefault();
        }
      }

      angular.element(container).on('click', open);
      angular.element(container).on('mousedown touchstart', preventNativeFocus);
      element.on('change', syncDisplay);
      scope.$watch(function() {
        var selected = select.options[select.selectedIndex];
        return [select.selectedIndex, select.disabled, select.options.length,
          selected && selected.textContent].join('|');
      }, syncDisplay);

      if (window.MutationObserver) {
        observer = new window.MutationObserver(function() {
          scope.$evalAsync(syncDisplay);
        });
        observer.observe(select, { childList: true, subtree: true, attributes: true });
      }

      syncDisplay();

      scope.$on('$destroy', function() {
        angular.element(container).off('click', open);
        angular.element(container).off('mousedown touchstart', preventNativeFocus);
        element.off('change', syncDisplay);
        observer && observer.disconnect();
        modal && modal.remove();
      });
    }
  };
}]);
