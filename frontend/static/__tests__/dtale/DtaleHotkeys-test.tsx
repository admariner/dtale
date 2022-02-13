import axios from 'axios';
import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { DtaleHotkeys } from '../../dtale/DtaleHotkeys';
import * as menuUtils from '../../menuUtils';
import { mockColumnDef } from '../mocks/MockColumnDef';
import reduxUtils from '../redux-test-utils';
import { buildInnerHTML } from '../test-utils';

describe('DtaleHotkeys tests', () => {
  const { open, innerWidth, innerHeight } = window;
  const text = 'COPIED_TEXT';
  let result: ReactWrapper;
  let buildClickHandlerSpy: jest.SpyInstance;
  let axiosPostSpy: jest.SpyInstance;
  let store: Store;
  const openSpy = jest.fn();

  beforeAll(() => {
    delete (window as any).open;
    window.open = openSpy;
    window.innerHeight = 800;
    window.innerWidth = 1400;
  });

  beforeEach(() => {
    buildClickHandlerSpy = jest.spyOn(menuUtils, 'buildClickHandler');
    const axiosGetSpy = jest.spyOn(axios, 'get');
    axiosGetSpy.mockImplementation((url: string) => Promise.resolve({ data: reduxUtils.urlFetcher(url) }));
    axiosPostSpy = jest.spyOn(axios, 'post');
    axiosPostSpy.mockResolvedValue(Promise.resolve({ data: undefined }));
    store = reduxUtils.createDtaleStore();
    buildInnerHTML({ settings: '' }, store);
    result = mount(
      <Provider store={store}>
        <DtaleHotkeys columns={[]} />
      </Provider>,
      { attachTo: document.getElementById('content') ?? undefined },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    window.open = open;
    window.innerHeight = innerHeight;
    window.innerWidth = innerWidth;
  });

  it('renders GlobalHotKeys', () => {
    expect(result.find(GlobalHotKeys).length).toBe(1);
  });

  it('does not render when cell being edited', () => {
    result.setProps({ editedCell: 'true' });
    expect(result.find(GlobalHotKeys).length).toBe(0);
  });

  it('sets state and fires click handler on menu open', () => {
    const hotkeys = result.find(GlobalHotKeys);
    const menuHandler = hotkeys.prop('handlers').MENU;
    menuHandler();
    expect(store.getState().menuOpen).toBe(true);
    expect(buildClickHandlerSpy.mock.calls).toHaveLength(1);
    buildClickHandlerSpy.mock.calls[0][0]();
    expect(store.getState().menuOpen).toBe(false);
  });

  it('opens new tab on describe open', () => {
    const hotkeys = result.find(GlobalHotKeys);
    const describeHandler = hotkeys.prop('handlers').DESCRIBE;
    describeHandler();
    expect(openSpy).toHaveBeenLastCalledWith('/dtale/popup/describe/1');
  });

  it('calls window.open on code export', () => {
    const hotkeys = result.find(GlobalHotKeys);
    const codeHandler = hotkeys.prop('handlers').CODE;
    codeHandler();
    expect(openSpy).toHaveBeenLastCalledWith('/dtale/popup/code-export/1');
  });

  it('calls window.open on chart display', () => {
    const hotkeys = result.find(GlobalHotKeys);
    const chartsHandler = hotkeys.prop('handlers').CHARTS;
    chartsHandler();
    expect(openSpy).toHaveBeenLastCalledWith('/dtale/charts/1');
  });

  it('calls openChart from redux', () => {
    const hotkeys = result.find(GlobalHotKeys);
    const filterHandler = hotkeys.prop('handlers').FILTER;
    filterHandler();
    expect(store.getState().chartData).toEqual(
      expect.objectContaining({
        type: 'filter',
        visible: true,
      }),
    );
  });

  it('calls openChart for copy handler when ctrlCols exists', () => {
    result.setProps({
      ctrlCols: [1],
      columns: [{}, { name: 'foo', index: 1 }],
    });
    const hotkeys = result.find(GlobalHotKeys);
    const copyHandler = hotkeys.prop('handlers').COPY;
    copyHandler();
    expect(axiosPostSpy).toBeCalledWith('/dtale/build-column-copy/1', { columns: `["foo"]` }, expect.any(Function));
    expect(store.getState().chartData).toEqual(
      expect.objectContaining({
        text,
        headers: ['foo'],
        type: 'copy-column-range',
        title: 'Copy Columns to Clipboard?',
      }),
    );
  });

  it('calls openChart for copy handler when ctrlRows exists', () => {
    result.setProps({
      ctrlRows: [1],
      columns: [mockColumnDef({ name: 'foo' })],
    });
    const hotkeys = result.find(GlobalHotKeys);
    const copyHandler = hotkeys.prop('handlers').COPY;
    copyHandler();
    expect(axiosPostSpy).toBeCalledWith(
      '/dtale/build-row-copy/1',
      { rows: '[0]', columns: `["foo"]` },
      expect.any(Function),
    );
    expect(store.getState().chartData).toEqual(
      expect.objectContaining({
        text,
        headers: ['foo'],
        type: 'copy-row-range',
        title: 'Copy Rows to Clipboard?',
      }),
    );
  });
});
