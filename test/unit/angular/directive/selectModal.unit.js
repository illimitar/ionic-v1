describe('Ionic select modal', function() {
  var compile;
  var scope;

  beforeEach(module('ionic'));

  beforeEach(inject(function($compile, $rootScope) {
    compile = $compile;
    scope = $rootScope.$new();
  }));

  function createSelect(attributes) {
    var element = compile(
      '<label class="item item-input item-select">' +
        '<span class="input-label">Ordenar Por</span>' +
        '<select ' + (attributes || '') + '>' +
          '<option value="name">Nome</option>' +
          '<option value="date">Data</option>' +
        '</select>' +
      '</label>'
    )(scope);
    scope.$digest();
    return element;
  }

  it('enhances a simple item-select without replacing its native select', function() {
    var element = createSelect('ng-model="order"');

    expect(element[0].querySelector('select')).not.toBeNull();
    expect(element[0].querySelector('.modern-select-display')).not.toBeNull();
    expect(element.hasClass('modern-select-enhanced')).toBe(true);
  });

  it('keeps multiple selects native', function() {
    var element = createSelect('multiple');

    expect(element[0].querySelector('.modern-select-display')).toBeNull();
    expect(element.hasClass('modern-select-enhanced')).toBe(false);
  });

  it('uses the default or declared placeholder for an empty option', function() {
    var defaultElement = compile(
      '<label class="item item-input item-select"><span class="input-label">Padrao</span>' +
      '<select><option value=""></option></select></label>'
    )(scope);
    var customElement = compile(
      '<label class="item item-input item-select"><span class="input-label">Personalizado</span>' +
      '<select placeholder="Escolha uma opcao"><option value=""></option></select></label>'
    )(scope);
    scope.$digest();

    expect(defaultElement[0].querySelector('.modern-select-display-value').textContent).toBe('Selecionar...');
    expect(customElement[0].querySelector('.modern-select-display-value').textContent).toBe('Escolha uma opcao');
  });

  it('mirrors selected text and disabled state', function() {
    var element = createSelect('ng-model="order" ng-disabled="disabled"');
    var display = element[0].querySelector('.modern-select-display');

    scope.order = 'date';
    scope.$digest();
    expect(display.textContent).toContain('Data');

    scope.disabled = true;
    scope.$digest();
    expect(display.disabled).toBe(true);
  });
});
