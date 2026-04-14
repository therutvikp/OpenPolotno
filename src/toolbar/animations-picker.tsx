'use client';

import React from 'react';
import { Button, Position, Switch, Slider, Alignment, NumericInput, ButtonGroup, MenuItem } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { observer } from 'mobx-react-lite';
import { t } from '../utils/l10n';

export const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

const AnimationTypeSelector = observer(({ element, store, enabled }: any) => {
  const enterAnim = element.animations.find((a: any) => a.type === 'enter');
  const exitAnim = element.animations.find((a: any) => a.type === 'exit');
  if (!enabled) return null;
  return React.createElement(
    ButtonGroup,
    { style: { width: '100%' } },
    React.createElement(Button, {
      fill: true,
      active: enterAnim?.enabled && !exitAnim?.enabled,
      onClick: () => {
        store.history.transaction(() => {
          element.setAnimation('enter', { enabled: true });
          element.setAnimation('exit', { enabled: false });
        });
      },
    }, 'Enter'),
    React.createElement(Button, {
      fill: true,
      active: enterAnim?.enabled && exitAnim?.enabled,
      onClick: () => {
        store.history.transaction(() => {
          element.setAnimation('enter', { enabled: true });
          element.setAnimation('exit', { enabled: true });
        });
      },
    }, 'Both'),
    React.createElement(Button, {
      fill: true,
      active: exitAnim?.enabled && !enterAnim?.enabled,
      onClick: () => {
        store.history.transaction(() => {
          element.setAnimation('enter', { enabled: false });
          element.setAnimation('exit', { enabled: true });
        });
      },
    }, 'Exit'),
  );
});

const DIRECTION_OPTIONS = ['right', 'left', 'up', 'down', 'bottom-right', 'bottom-left', 'top-right', 'top-left'];

const directionItemRenderer = (item: string, { handleClick, handleFocus, modifiers }: any) => {
  if (!modifiers.matchesPredicate) return null;
  return React.createElement(MenuItem, {
    active: modifiers.active,
    disabled: modifiers.disabled,
    key: item,
    onClick: handleClick,
    icon: 'arrow-' + item,
    onFocus: handleFocus,
    roleStructure: 'listoption',
    text: item,
    shouldDismissPopover: false,
  });
};

const DirectionPicker = observer(({ value, onChange }: any) =>
  React.createElement(
    'div',
    { style: { paddingTop: '10px' } },
    React.createElement(
      Select,
      { items: DIRECTION_OPTIONS, itemRenderer: directionItemRenderer, filterable: false, activeItem: value, onItemSelect: onChange },
      React.createElement(Button, { text: value, icon: 'arrow-' + value, fill: true }),
    ),
  ),
);

const DelayPicker = observer(({ element }: any) => {
  const anim = element.animations.find((a: any) => a.type === 'enter');
  if (!anim) return null;
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'Delay'),
      React.createElement('div', null,
        React.createElement(NumberInput, {
          value: parseFloat((anim.delay / 1000).toFixed(2)),
          onValueChange: (v: number) => { element.setAnimation('enter', { delay: 1000 * v }); },
          style: { width: '50px' },
          minorStepSize: 0.01,
          stepSize: 0.01,
          min: 0,
          max: 2.5,
          buttonPosition: 'none',
        }),
      ),
    ),
    React.createElement(Slider, {
      min: 0, max: 1000, value: anim.delay, showTrackFill: false, labelRenderer: false,
      onChange: (v: number) => { element.setAnimation('enter', { delay: v }); },
    }),
  );
});

const DurationPicker = observer(({ element }: any) => {
  const anim = element.animations.find((a: any) => a.type === 'enter');
  if (!anim) return null;
  return React.createElement(
    'div',
    { style: { padding: '10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
      React.createElement('div', null, 'Duration'),
      React.createElement('div', null,
        React.createElement(NumberInput, {
          value: parseFloat((anim.duration / 1000).toFixed(2)),
          onValueChange: (v: number) => {
            element.setAnimation('enter', { duration: 1000 * v });
            element.setAnimation('exit', { duration: 1000 * v });
          },
          style: { width: '50px' },
          minorStepSize: 0.01,
          stepSize: 0.01,
          min: 0,
          max: 2.5,
          buttonPosition: 'none',
        }),
      ),
    ),
    React.createElement(Slider, {
      min: 0, max: 2500, value: anim.duration, showTrackFill: false, labelRenderer: false,
      onChange: (v: number) => {
        element.setAnimation('enter', { duration: v });
        element.setAnimation('exit', { duration: v });
      },
    }),
  );
});

export const AnimationsPickerOld = observer(({ element, store, elements }: any) => {
  const targets = elements || [element];
  const first = targets[0];

  const applyAnim = (name: string, props: any) => {
    store.history.transaction(() => {
      targets.forEach((el: any) => {
        el.setAnimation('enter', { name, ...props });
        el.setAnimation('exit', { name, ...props, from: props.to, to: props.from });
      });
    });
    if (props.enabled) {
      store.play({ animatedElementsIds: targets.map((el: any) => el.id), currentTime: first.page.startTime });
      setTimeout(() => { store.stop(); }, 1000);
    }
  };

  const isActive = (name?: string, filter?: any): boolean => {
    const anims = (name ? first.animations?.filter((a: any) => a.name === name) : first.animations) || [];
    return !!anims.find((a: any) => a.enabled);
  };

  const moveAnim = first.animations.find((a: any) => a.name === 'move');
  const moveDirection = moveAnim?.data?.direction || 'right';
  const anyEnabled = isActive();

  return React.createElement(
    Popover,
    {
      hasBackdrop: false,
      autoFocus: false,
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '25px', width: '230px' } },
        React.createElement(Switch, { checked: isActive('fade'), label: t('toolbar.fade'), onChange: (e: any) => { applyAnim('fade', { enabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: isActive('move'), label: t('toolbar.move'), onChange: (e: any) => { applyAnim('move', { enabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: isActive('zoom'), label: t('toolbar.zoom'), onChange: (e: any) => { applyAnim('zoom', { enabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(AnimationTypeSelector, { element: first, store, enabled: anyEnabled }),
        isActive('move') && React.createElement(DirectionPicker, {
          value: moveDirection,
          onChange: (dir: string) => { applyAnim('move', { data: { direction: dir }, enabled: true }); },
        }),
        anyEnabled && React.createElement(DelayPicker, { store, element }),
        anyEnabled && React.createElement(DurationPicker, { store, element }),
        React.createElement(Switch, {
          checked: isActive('rotate'),
          label: t('toolbar.rotate'),
          onChange: (e: any) => {
            const props = { enabled: e.target.checked };
            store.history.transaction(() => {
              targets.forEach((el: any) => { el.setAnimation('loop', { name: 'rotate', ...props }); });
            });
            if ((props as any).enabled) {
              store.play({ animatedElementsIds: targets.map((el: any) => el.id), currentTime: first.page.startTime });
              setTimeout(() => { store.stop(); }, 1000);
            }
          },
          alignIndicator: Alignment.RIGHT,
        }),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, { text: t('toolbar.animate'), minimal: true }),
  );
});

export const AnimationsPicker = observer(({ element, store }: any) => {
  if (!element.contentEditable) return null;
  return React.createElement(Button, {
    minimal: true,
    text: t('toolbar.animate'),
    onClickCapture: (e: any) => { e.stopPropagation(); store.openSidePanel('animation'); },
  });
});

export default AnimationsPicker;
