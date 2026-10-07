/* João — inicialização */
(function (G) {
  'use strict';
  const { Store, UI } = G;
  Store.load();
  Store.onChange = () => UI.render();
  UI.applyTheme();
  UI.render();
  if (!Store.storageOk) UI.toast('Atenção: o navegador bloqueou o armazenamento local. As alterações valem só até fechar esta aba.', 'warn');
})(window);
