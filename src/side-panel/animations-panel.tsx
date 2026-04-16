'use client';
import React from 'react';
import { Button, NumericInput, Slider } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { Cross } from '@blueprintjs/icons';
import { MenuItem } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { t as s } from '../utils/l10n';
import styled from '../utils/styled';
import { StoreType } from '../model/store';

export const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

const SectionContainer = styled('div')`
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.05);
  .bp5-dark & {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

// SVG Icons
const MoveIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M11.375 6.125H7C6.76793 6.125 6.54537 6.21719 6.38128 6.38128C6.21719 6.54537 6.125 6.76793 6.125 7V11.375C6.125 11.6071 6.21719 11.8296 6.38128 11.9937C6.54537 12.1578 6.76793 12.25 7 12.25C7.23207 12.25 7.45463 12.1578 7.61872 11.9937C7.78281 11.8296 7.875 11.6071 7.875 11.375V8.24703L12.507 12.879C12.6713 13.0379 12.8922 13.1263 13.1215 13.1244C13.3508 13.1226 13.5703 13.0307 13.7321 12.8693C13.8938 12.7078 13.9862 12.4885 13.9885 12.2593C13.9908 12.0301 13.9028 11.809 13.7441 11.6444L9.11219 7.01234C9.27603 6.8474 9.49928 6.7547 9.73203 6.75H11.375C11.6071 6.75 11.8296 6.65781 11.9937 6.49372C12.1578 6.32963 12.25 6.10706 12.25 5.875C12.25 5.64294 12.1578 5.42037 11.9937 5.25628C11.8296 5.09219 11.6071 5 11.375 5ZM16.625 21.875H21C21.2321 21.875 21.4546 21.7828 21.6187 21.6187C21.7828 21.4546 21.875 21.2321 21.875 21V16.625C21.875 16.3929 21.7828 16.1704 21.6187 16.0063C21.4546 15.8422 21.2321 15.75 21 15.75C20.7679 15.75 20.5454 15.8422 20.3813 16.0063C20.2172 16.1704 20.125 16.3929 20.125 16.625V19.763L15.493 15.131C15.3287 14.9721 15.1078 14.8837 14.8785 14.8856C14.6492 14.8874 14.4297 14.9793 14.2679 15.1407C14.1062 15.3022 14.0138 15.5215 14.0115 15.7507C14.0092 15.9799 14.0972 16.201 14.2559 16.3656L18.8878 20.9977C18.724 21.1626 18.5007 21.2553 18.268 21.26H16.625C16.3929 21.26 16.1704 21.3522 16.0063 21.5163C15.8422 21.6804 15.75 21.9029 15.75 22.135C15.75 22.3671 15.8422 22.5896 16.0063 22.7537C16.1704 22.9178 16.3929 23.01 16.625 23.01V21.875Z', fill: 'currentColor' })
);

const FadeIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M14 3.5C8.20125 3.5 3.5 8.20125 3.5 14C3.5 19.7987 8.20125 24.5 14 24.5C19.7987 24.5 24.5 19.7987 24.5 14C24.5 8.20125 19.7987 3.5 14 3.5ZM14 22.75C9.16562 22.75 5.25 18.8344 5.25 14C5.25 9.16562 9.16562 5.25 14 5.25V22.75Z', fill: 'currentColor' })
);

const ZoomIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M11.375 6.125C11.1429 6.125 10.9204 6.21719 10.7563 6.38128C10.5922 6.54537 10.5 6.76793 10.5 7C10.5 7.23207 10.5922 7.45463 10.7563 7.61872C10.9204 7.78281 11.1429 7.875 11.375 7.875H13.6381L9.00594 12.507C8.84706 12.6713 8.75872 12.8922 8.76058 13.1215C8.76244 13.3508 8.85434 13.5703 9.01572 13.7321C9.1771 13.8938 9.39644 13.9862 9.62566 13.9885C9.85488 13.9908 10.076 13.9028 10.2406 13.7441L14.8725 9.11219C14.8816 9.2752 14.8816 9.3748 14.8725 9.4378C14.8634 9.50084 14.8464 9.5628 14.8216 9.62274C14.7841 9.71275 14.7245 9.7913 14.648 9.84903C14.5714 9.90675 14.481 9.94178 14.3865 9.95041C14.3154 9.95721 14.2438 9.95063 14.175 9.93109L11.375 6.125ZM16.625 21.875C16.8571 21.875 17.0796 21.7828 17.2437 21.6187C17.4078 21.4546 17.5 21.2321 17.5 21C17.5 20.7679 17.4078 20.5454 17.2437 20.3813C17.0796 20.2172 16.8571 20.125 16.625 20.125H14.3619L18.9941 15.493C19.1529 15.3287 19.2413 15.1078 19.2394 14.8785C19.2376 14.6492 19.1457 14.4297 18.9843 14.2679C18.8229 14.1062 18.6036 14.0138 18.3743 14.0115C18.1451 14.0092 17.924 14.0972 17.7594 14.2559L13.1275 18.8878C13.0184 18.7237 13.0 18.3748 13.0 18.268V16.625C13.0 16.3929 12.9078 16.1704 12.7437 16.0063C12.5796 15.8422 12.3571 15.75 12.125 15.75C11.8929 15.75 11.6704 15.8422 11.5063 16.0063C11.3422 16.1704 11.25 16.3929 11.25 16.625V21C11.25 21.2321 11.3422 21.4546 11.5063 21.6187C11.6704 21.7828 11.8929 21.875 12.125 21.875H16.625Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M4.63094 5.86906L9.26297 10.5H7C6.76793 10.5 6.54537 10.5922 6.38128 10.7563C6.21719 10.9204 6.125 11.1429 6.125 11.375C6.125 11.6071 6.21719 11.8296 6.38128 11.9937C6.54537 12.1578 6.76793 12.25 7 12.25H11.375C11.6071 12.25 11.8296 12.1578 11.9937 11.9937C12.1578 11.8296 12.25 11.6071 12.25 11.375V7C12.25 6.76793 12.1578 6.54537 11.9937 6.38128C11.8296 6.21719 11.6071 6.125 11.375 6.125H7C6.76793 6.125 6.54537 6.21719 6.38128 6.38128C6.21719 6.54537 6.125 6.76793 6.125 7C6.125 7.23207 6.21719 7.45463 6.38128 7.61872C6.54537 7.78281 6.76793 7.875 7 7.875H8.38781L4.63094 4.11816C4.46675 4.29512 4.37451 4.5178 4.37451 4.75C4.37451 4.98219 4.46675 5.20488 4.63094 5.86906Z', fill: 'currentColor' })
);

const RotateIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M9.625 11.375H4.375C4.14294 11.375 3.92038 11.2828 3.75628 11.1187C3.59219 10.9546 3.5 10.7321 3.5 10.5V5.25001C3.5 5.01794 3.59219 4.79538 3.75628 4.63129C3.92038 4.46719 4.14294 4.37501 4.375 4.37501C4.60706 4.37501 4.82962 4.46719 4.99372 4.63129C5.15781 4.79538 5.25 5.01794 5.25 5.25001V8.38797L6.85016 6.78782C8.80164 4.82651 11.452 3.72026 14.2188 3.71219H14.2767C17.0199 3.70513 19.6555 4.77908 21.6125 6.70141C21.7723 6.86488 21.8618 7.0844 21.8618 7.313C21.8618 7.5416 21.7723 7.76112 21.6126 7.92461C21.4528 8.0881 21.2354 8.18257 21.0068 8.18781C20.7783 8.19306 20.5568 8.10865 20.3897 7.95266C18.7584 6.3515 16.5625 5.45684 14.2767 5.46219H14.2275C11.9221 5.46929 9.71368 6.39096 8.08719 8.02485L6.48703 9.62501H9.625C9.85706 9.62501 10.0796 9.71719 10.2437 9.88129C10.4078 10.0454 10.5 10.2679 10.5 10.5C10.5 10.7321 10.4078 10.9546 10.2437 11.1187C10.0796 11.2828 9.85706 11.375 9.625 11.375ZM23.625 16.625H18.375C18.1429 16.625 17.9204 16.7172 17.7563 16.8813C17.5922 17.0454 17.5 17.2679 17.5 17.5C17.5 17.7321 17.5922 17.9546 17.7563 18.1187C17.9204 18.2828 18.1429 18.375 18.375 18.375H21.513L19.9128 19.9752C18.2866 21.6088 16.0786 22.5304 13.7736 22.5378H13.7244C11.4386 22.5432 9.24264 21.6485 7.61141 20.0473C7.44643 19.8877 7.22554 19.7983 6.99694 19.7983C6.76834 19.7983 6.54745 19.8877 6.38247 20.0473C6.21749 20.2069 6.125 20.4215 6.125 20.6454C6.125 20.8692 6.21749 21.0838 6.38247 21.2434C8.3456 23.2209 10.9812 24.2949 13.7244 24.2878H13.7812C16.5476 24.2795 19.1975 23.1732 21.1488 21.2122L22.75 19.612V22.75C22.75 22.9821 22.8422 23.2046 23.0063 23.3687C23.1704 23.5328 23.3929 23.625 23.625 23.625C23.8571 23.625 24.0796 23.5328 24.2437 23.3687C24.4078 23.2046 24.5 22.9821 24.5 22.75V17.5C24.5 17.2679 24.4078 17.0454 24.2437 16.8813C24.0796 16.7172 23.8571 16.625 23.625 16.625Z', fill: 'currentColor' })
);

const BlinkIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M24.9374 19.1406C24.8375 19.1976 24.7273 19.2343 24.6132 19.2487C24.499 19.263 24.3831 19.2547 24.2722 19.2243C24.1613 19.1938 24.0574 19.1417 23.9666 19.0711C23.8758 19.0004 23.7999 18.9126 23.7431 18.8125L21.6649 15.1813C20.4568 15.9982 19.124 16.6136 17.7187 17.0034L18.3607 20.8556C18.3797 20.969 18.3761 21.0851 18.3502 21.1971C18.3242 21.3091 18.2765 21.4149 18.2096 21.5085C18.1428 21.602 18.0582 21.6815 17.9606 21.7423C17.8631 21.8031 17.7545 21.8441 17.641 21.863C17.5944 21.8706 17.5472 21.8746 17.4999 21.875C17.2929 21.8747 17.0928 21.801 16.935 21.667C16.7772 21.5331 16.672 21.3475 16.6381 21.1433L16.007 17.3611C14.6761 17.5463 13.326 17.5463 11.9951 17.3611L11.364 21.1433C11.33 21.3479 11.2245 21.5337 11.0663 21.6677C10.908 21.8018 10.7073 21.8752 10.4999 21.875C10.4516 21.8748 10.4033 21.8708 10.3556 21.863C10.2421 21.8441 10.1335 21.8031 10.036 21.7423C9.93842 21.6815 9.8538 21.602 9.78696 21.5085C9.72012 21.4149 9.67238 21.3091 9.64645 21.1971C9.62053 21.0851 9.61694 20.969 9.63588 20.8556L10.2812 17.0034C8.87641 16.6123 7.54441 15.9958 6.33713 15.178L4.26557 18.8125C4.14954 19.0147 3.95794 19.1625 3.73292 19.2234C3.50791 19.2843 3.26791 19.2534 3.06573 19.1374C2.86354 19.0213 2.71573 18.8297 2.65481 18.6047C2.59389 18.3797 2.62485 18.1397 2.74088 17.9375L4.92838 14.1094C4.16002 13.4456 3.45348 12.7134 2.81744 11.9219C2.63812 11.7054 2.55368 11.4284 2.58218 11.1519C2.61069 10.8754 2.74975 10.6208 2.96891 10.4445C3.18807 10.2683 3.46853 10.1848 3.74924 10.2116C4.02994 10.2384 4.28897 10.3733 4.46838 10.5882C5.57266 12.0747 9.17213 15.75 13.9999 15.75C18.8278 15.75 22.004 13.0714 23.8196 10.8281C23.9995 10.6125 24.2601 10.4776 24.5424 10.4534C24.8247 10.4293 25.1053 10.5181 25.3196 10.7C25.5339 10.882 25.6643 11.1425 25.6826 11.4224C25.7009 11.7023 25.6057 11.9769 25.418 12.1844C24.7853 12.9704 24.0822 13.6988 23.3181 14.3594L25.2568 17.9375C25.3155 18.0373 25.3539 18.1477 25.3696 18.2625C25.3853 18.3772 25.3781 18.4939 25.3484 18.6058C25.3187 18.7177 25.2671 18.8226 25.1965 18.9144C25.126 19.0062 25.0379 19.0831 24.9374 19.1406Z', fill: 'currentColor' })
);

const BounceIcon = () => React.createElement('svg', { width: '28', height: '28', viewBox: '0 0 28 28', xmlns: 'http://www.w3.org/2000/svg', style: { margin: 0 } },
  React.createElement('path', { d: 'M14 3.5C18.6944 3.5 22.5 7.30558 22.5 12C22.5 16.6944 18.6944 20.5 14 20.5C9.30558 20.5 5.5 16.6944 5.5 12C5.5 7.30558 9.30558 3.5 14 3.5ZM14 5.25C10.2721 5.25 7.25 8.27208 7.25 12C7.25 15.7279 10.2721 18.75 14 18.75C17.7279 18.75 20.75 15.7279 20.75 12C20.75 8.27208 17.7279 5.25 14 5.25ZM14 7C16.7614 7 19 9.23858 19 12C19 14.7614 16.7614 17 14 17C11.2386 17 9 14.7614 9 12C9 9.23858 11.2386 7 14 7ZM14 8.75C12.2051 8.75 10.75 10.2051 10.75 12C10.75 13.7949 12.2051 15.25 14 15.25C15.7949 15.25 17.25 13.7949 17.25 12C17.25 10.2051 15.7949 8.75 14 8.75ZM14 10.5C14.8284 10.5 15.5 11.1716 15.5 12C15.5 12.8284 14.8284 13.5 14 13.5C13.1716 13.5 12.5 12.8284 12.5 12C12.5 11.1716 13.1716 10.5 14 10.5Z', fill: 'currentColor' })
);

// Per-animation Enter/Both/Exit toggle — each animation (move/fade/zoom) has its own.
const PerAnimEnterExitToggle = observer(({ element, store, name }: any) => {
  const enterEnabled = !!(element.animations as any[]).find((a: any) => a.name === name && a.type === 'enter' && a.enabled);
  const exitEnabled = !!(element.animations as any[]).find((a: any) => a.name === name && a.type === 'exit' && a.enabled);

  const setMode = (mode: 'enter' | 'both' | 'exit') => {
    store.history.transaction(() => {
      element.setAnimation('enter', { name, enabled: mode !== 'exit' });
      element.setAnimation('exit', { name, enabled: mode !== 'enter' });
    });
  };

  return React.createElement(
    'div',
    { style: { display: 'flex', gap: 8, paddingTop: '8px', paddingBottom: '4px' } },
    React.createElement(Button, { fill: true, small: true, active: enterEnabled && !exitEnabled, onClick: () => setMode('enter') }, 'Enter'),
    React.createElement(Button, { fill: true, small: true, active: enterEnabled && exitEnabled, onClick: () => setMode('both') }, 'Both'),
    React.createElement(Button, { fill: true, small: true, active: exitEnabled && !enterEnabled, onClick: () => setMode('exit') }, 'Exit'),
  );
});

const directions = ['right', 'left', 'up', 'down', 'bottom-right', 'bottom-left', 'top-right', 'top-left'];

const directionItemRenderer = (dir: string, { handleClick, handleFocus, modifiers }: any) => {
  if (!modifiers.matchesPredicate) return null;
  return React.createElement(MenuItem, {
    active: modifiers.active,
    disabled: modifiers.disabled,
    key: dir,
    onClick: handleClick,
    icon: 'arrow-' + dir,
    onFocus: handleFocus,
    roleStructure: 'listoption',
    text: dir,
    shouldDismissPopover: false,
  });
};

const DirectionPicker = observer(({ value, onChange }: any) =>
  React.createElement(
    'div',
    { style: { paddingTop: '10px' } },
    React.createElement('div', { style: { paddingBottom: '10px' } }, 'Direction'),
    React.createElement(
      Select,
      { items: directions, itemRenderer: directionItemRenderer, filterable: false, activeItem: value, onItemSelect: (d: string) => { onChange(d); } },
      React.createElement(Button, { text: value, icon: 'arrow-' + value, fill: true })
    )
  )
);

const ZoomDirectionPicker = observer(({ value, onChange }: any) =>
  React.createElement(
    'div',
    { style: { paddingTop: '10px' } },
    React.createElement('div', { style: { paddingBottom: '10px' } }, 'Direction'),
    React.createElement(
      Select,
      {
        items: ['in', 'out'],
        itemRenderer: (dir: string, { handleClick, handleFocus, modifiers }: any) => {
          if (!modifiers.matchesPredicate) return null;
          return React.createElement(MenuItem, {
            active: modifiers.active, disabled: modifiers.disabled, key: dir, onClick: handleClick, onFocus: handleFocus,
            roleStructure: 'listoption', text: dir === 'out' ? 'Zoom Out' : 'Zoom In', shouldDismissPopover: false,
          });
        },
        filterable: false, activeItem: value, onItemSelect: (d: string) => { onChange(d); },
      },
      React.createElement(Button, { text: value === 'out' ? 'Zoom Out' : 'Zoom In', fill: true })
    )
  )
);

const DelayPicker = observer(({ element, store }: any) => {
  const enterAnims = (element.animations as any[]).filter((a) => a.type === 'enter' && a.enabled);
  const enterAnim = enterAnims[0];
  if (!enterAnim) return null;
  const pageDuration = element.page.duration;
  const setDelay = (v: number) => {
    enterAnims.forEach((a: any) => element.setAnimation('enter', { name: a.name, delay: v }));
  };
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'Delay'),
      React.createElement('div', null, React.createElement(NumberInput, {
        value: parseFloat((enterAnim.delay / 1000).toFixed(2)),
        onValueChange: (v: number) => setDelay(1000 * v),
        style: { width: '50px' }, minorStepSize: 0.01, stepSize: 0.01, min: 0, max: pageDuration / 1000, buttonPosition: 'none',
      }))
    ),
    React.createElement(Slider, { min: 0, max: pageDuration, value: enterAnim.delay, showTrackFill: false, labelRenderer: false, onChange: (v: number) => setDelay(v) })
  );
});

const SpeedPicker = observer(({ element, store }: any) => {
  const loopAnims = (element.animations as any[]).filter((a) => a.type === 'loop' && a.enabled);
  const loopAnim = loopAnims[0];
  if (!loopAnim) return null;
  const speed = 500 / loopAnim.duration;
  const setSpeed = (v: number) => {
    const clamped = Math.min(Math.max(0.1, v), 3);
    loopAnims.forEach((a: any) => element.setAnimation('loop', { name: a.name, duration: 500 / clamped }));
  };
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'Speed'),
      React.createElement('div', null, React.createElement(NumberInput, {
        value: speed,
        onValueChange: (v: number) => setSpeed(v),
        style: { width: '50px' }, minorStepSize: 0.01, stepSize: 0.01, min: 0.1, max: 3, buttonPosition: 'none',
      }))
    ),
    React.createElement(Slider, {
      min: 0.1, max: 3, stepSize: 0.01, value: speed, showTrackFill: false, labelRenderer: false,
      onChange: (v: number) => setSpeed(v),
      onRelease: () => {
        const page = store.activePage;
        store.play({ animatedElementsIds: [element.id], currentTime: element.page.startTime });
        setTimeout(() => { store.stop(); store.selectPage(page?.id); }, 1000);
      },
    })
  );
});

const DurationPicker = observer(({ element, store }: any) => {
  const enterAnims = (element.animations as any[]).filter((a) => a.type === 'enter' && a.enabled);
  const exitAnims = (element.animations as any[]).filter((a) => a.type === 'exit' && a.enabled);
  const enterAnim = enterAnims[0];
  if (!enterAnim) return null;
  const pageDuration = element.page.duration;
  const setDuration = (v: number) => {
    enterAnims.forEach((a: any) => element.setAnimation('enter', { name: a.name, duration: v }));
    exitAnims.forEach((a: any) => element.setAnimation('exit', { name: a.name, duration: v }));
  };
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'Duration'),
      React.createElement('div', null, React.createElement(NumberInput, {
        value: parseFloat((enterAnim.duration / 1000).toFixed(2)),
        onValueChange: (v: number) => setDuration(1000 * v),
        style: { width: '50px' }, minorStepSize: 0.01, stepSize: 0.01, min: 0, max: pageDuration / 1000, buttonPosition: 'none',
      }))
    ),
    React.createElement(Slider, {
      min: 0, max: pageDuration, value: enterAnim.duration, showTrackFill: false, labelRenderer: false,
      onChange: (v: number) => setDuration(v),
    })
  );
});

const StrengthPicker = observer(({ element, store, animationName }: any) => {
  const anim = element.animations.find((a: any) => a.name === animationName && a.enabled);
  if (!anim) return null;
  const strength = anim.data?.strength ?? 1;
  let defaultMax = 2;
  if (animationName === 'move') defaultMax = 3;

  const debounced = (() => {
    let timer: any;
    return (...args: any[]) => {
      timer && clearTimeout(timer);
      timer = setTimeout(() => {
        if (!store.isPlaying) {
          store.play({ animatedElementsIds: [element.id], currentTime: element.page.startTime });
          const page = store.activePage;
          setTimeout(() => { store.stop(); page && store.selectPage(page.id); }, 1000);
        }
      }, 300);
    };
  })();

  const setStrength = (val: number) => {
    store.history.transaction(() => {
      element.animations.forEach((a: any) => {
        if (a.name === animationName) {
          const data = a.data || {};
          element.setAnimation(a.type, { name: a.name, data: Object.assign(Object.assign({}, data), { strength: val }) });
        }
      });
    });
    debounced();
  };

  const maxSlider = Math.max(3, strength);

  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, s('toolbar.strength')),
      React.createElement('div', null, React.createElement(NumberInput, {
        value: parseFloat(strength.toFixed(2)),
        onValueChange: (v: number) => { setStrength(Math.max(0.1, v)); },
        style: { width: '50px' }, minorStepSize: 0.05, stepSize: 0.1, min: 0.1, buttonPosition: 'none',
      }))
    ),
    React.createElement(Slider, { min: 0.1, max: maxSlider, stepSize: 0.05, value: strength, showTrackFill: false, labelRenderer: false, onChange: setStrength })
  );
});

const EndDelayPicker = observer(({ element, store }: any) => {
  const exitAnims = (element.animations as any[]).filter((a) => a.type === 'exit' && a.enabled);
  const exitAnim = exitAnims[0];
  if (!exitAnim) return null;
  const pageDuration = element.page.duration;
  const setDelay = (v: number) => {
    exitAnims.forEach((a: any) => element.setAnimation('exit', { name: a.name, delay: v }));
  };
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'End Delay'),
      React.createElement('div', null, React.createElement(NumberInput, {
        value: parseFloat((exitAnim.delay / 1000).toFixed(2)),
        onValueChange: (v: number) => setDelay(1000 * v),
        style: { width: '50px' }, minorStepSize: 0.01, stepSize: 0.01, min: 0, max: pageDuration / 1000, buttonPosition: 'none',
      }))
    ),
    React.createElement(Slider, { min: 0, max: pageDuration, value: exitAnim.delay, showTrackFill: false, labelRenderer: false, onChange: (v: number) => setDelay(v) })
  );
});

export const AnimationsPanel = observer(({ store }: { store: StoreType }) => {
  const elements = store.selectedElements as any[];
  const el = elements[0];
  const firstEl = el;

  const getIds = () => store.selectedElements.map((e: any) => e.id).join(',');
  const initialIds = React.useMemo(getIds, []);
  const currentIds = getIds();

  React.useEffect(() => {
    if (initialIds !== currentIds) store.openSidePanel(store.previousOpenedSidePanel);
  }, [initialIds, currentIds]);

  if (!el || !el.animations) return null;

  // Toggle enter+exit on or off — used by the Move/Fade/Zoom buttons.
  const setEnterExit = (name: string, attrs: any) => {
    store.history.transaction(() => {
      elements.forEach((e) => {
        e.setAnimation('enter', Object.assign({ name }, attrs));
        e.setAnimation('exit', Object.assign({ name }, attrs));
      });
    });
    if (attrs.enabled) {
      const page = store.activePage;
      store.play({ animatedElementsIds: elements.map((e) => e.id), currentTime: el.page.startTime });
      setTimeout(() => { store.stop(); store.selectPage(page?.id); }, 1000);
    }
  };

  // Update animation data (direction, etc.) without changing enabled state.
  const updateAnimData = (name: string, newData: Record<string, any>) => {
    store.history.transaction(() => {
      elements.forEach((e: any) => {
        (e.animations as any[]).filter((a: any) => a.name === name).forEach((a: any) => {
          e.setAnimation(a.type, { name, data: Object.assign({}, a.data || {}, newData) });
        });
      });
    });
  };

  const setLoop = (name: string, attrs: any) => {
    store.history.transaction(() => {
      elements.forEach((e) => { e.setAnimation('loop', Object.assign({ name }, attrs)); });
    });
    if (attrs.enabled) {
      const page = store.activePage;
      store.play({ animatedElementsIds: elements.map((e) => e.id), currentTime: el.page.startTime });
      setTimeout(() => { store.stop(); store.selectPage(page?.id); }, 1000);
    }
  };

  const isEnabled = (nameOrType?: string) => {
    const anims = nameOrType
      ? (el.animations as any[]).filter((a) => a.name === nameOrType || a.type === nameOrType)
      : (el.animations as any[]);
    return !!(anims || []).find((a) => a.enabled);
  };

  const hasEnterExit = isEnabled('move') || isEnabled('fade') || isEnabled('zoom');
  const hasLoop = isEnabled('rotate') || isEnabled('blink') || isEnabled('bounce');

  const moveAnim = el.animations.find((a: any) => a.name === 'move');
  const zoomAnim = el.animations.find((a: any) => a.name === 'zoom');

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '0 10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' } },
      React.createElement('h3', { style: { margin: 0, lineHeight: '30px' } }, s('sidePanel.animate')),
      React.createElement(Button, { minimal: true, icon: React.createElement(Cross, null), onClick: () => store.openSidePanel(store.previousOpenedSidePanel) })
    ),
    // Animations section
    React.createElement(
      'div',
      { style: { paddingTop: '10px', lineHeight: '35px' } },
      'Animations ',
      React.createElement(Button, {
        outlined: true,
        style: { marginLeft: '10px', display: hasEnterExit ? 'inline-flex' : 'none' },
        onClick: () => { firstEl.set({ animations: [] }); },
      }, 'Remove All')
    ),
    React.createElement(
      'div',
      { style: { paddingTop: '25px' } },
      // Animation type buttons
      React.createElement(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '5px', paddingBottom: '10px' } },
        React.createElement('div', null, React.createElement(Button, { outlined: true, large: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, icon: React.createElement(MoveIcon, null), active: isEnabled('move'), fill: true, onClick: () => { setEnterExit('move', { enabled: !isEnabled('move') }); } }, s('toolbar.move'))),
        React.createElement('div', null, React.createElement(Button, { outlined: true, large: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, icon: React.createElement(FadeIcon, null), fill: true, active: isEnabled('fade'), onClick: () => { setEnterExit('fade', { enabled: !isEnabled('fade') }); } }, s('toolbar.fade'))),
        React.createElement('div', null, React.createElement(Button, { outlined: true, large: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, icon: React.createElement(ZoomIcon, null), fill: true, active: isEnabled('zoom'), onClick: () => { setEnterExit('zoom', { enabled: !isEnabled('zoom') }); } }, s('toolbar.zoom')))
      ),
      // Per-animation settings — each animation has its own Enter/Both/Exit toggle
      isEnabled('move') && React.createElement(
        SectionContainer,
        { style: { marginBottom: '6px' } },
        React.createElement('div', { style: { paddingTop: '6px', paddingBottom: '2px', fontWeight: 500 } }, 'Move'),
        React.createElement(PerAnimEnterExitToggle, { element: el, store, name: 'move' }),
        React.createElement(DirectionPicker, { value: moveAnim?.data?.direction || 'right', onChange: (d: string) => { updateAnimData('move', { direction: d }); } }),
        React.createElement(StrengthPicker, { store, element: firstEl, animationName: 'move' }),
      ),
      isEnabled('fade') && React.createElement(
        SectionContainer,
        { style: { marginBottom: '6px' } },
        React.createElement('div', { style: { paddingTop: '6px', paddingBottom: '2px', fontWeight: 500 } }, 'Fade'),
        React.createElement(PerAnimEnterExitToggle, { element: el, store, name: 'fade' }),
      ),
      isEnabled('zoom') && React.createElement(
        SectionContainer,
        { style: { marginBottom: '6px' } },
        React.createElement('div', { style: { paddingTop: '6px', paddingBottom: '2px', fontWeight: 500 } }, 'Zoom'),
        React.createElement(PerAnimEnterExitToggle, { element: el, store, name: 'zoom' }),
        React.createElement(ZoomDirectionPicker, { value: zoomAnim?.data?.direction || 'in', onChange: (d: string) => { updateAnimData('zoom', { direction: d }); } }),
        React.createElement(StrengthPicker, { store, element: firstEl, animationName: 'zoom' }),
      ),
      // Shared timing controls
      hasEnterExit && React.createElement(
        SectionContainer,
        null,
        isEnabled('enter') && React.createElement(DelayPicker, { store, element: firstEl }),
        isEnabled('enter') && React.createElement(DurationPicker, { store, element: firstEl }),
        isEnabled('exit') && React.createElement(EndDelayPicker, { store, element: firstEl }),
      ),
    ),
    // Effects section
    React.createElement(
      'div',
      { style: { paddingTop: '10px', lineHeight: '35px' } },
      'Effects ',
      React.createElement(Button, {
        outlined: true,
        style: { marginLeft: '10px', display: hasLoop ? 'inline-flex' : 'none' },
        onClick: () => { firstEl.set({ animations: [] }); },
      }, 'Remove All')
    ),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '5px', paddingTop: '10px' } },
      React.createElement('div', null, React.createElement(Button, { minimal: true, outlined: true, large: true, fill: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, icon: React.createElement(RotateIcon, null), active: isEnabled('rotate'), onClick: () => { setLoop('rotate', { enabled: !isEnabled('rotate') }); } }, s('toolbar.rotate'))),
      React.createElement('div', null, React.createElement(Button, { outlined: true, large: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, fill: true, icon: React.createElement(BlinkIcon, null), active: isEnabled('blink'), onClick: () => { setLoop('blink', { enabled: !isEnabled('blink') }); } }, s('toolbar.blink'))),
      React.createElement('div', null, React.createElement(Button, { minimal: true, outlined: true, large: true, style: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, icon: React.createElement(BounceIcon, null), fill: true, active: isEnabled('bounce'), onClick: () => { setLoop('bounce', { enabled: !isEnabled('bounce') }); } }, s('toolbar.bounce')))
    ),
    hasLoop && React.createElement(SpeedPicker, { store, element: firstEl }),
    isEnabled('bounce') && React.createElement(StrengthPicker, { store, element: firstEl, animationName: 'bounce' })
  );
});
