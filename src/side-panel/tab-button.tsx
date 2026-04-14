'use client';
import React from 'react';
import styled from '../utils/styled';
import { mobileStyle } from '../utils/screen';

const TabContainer = styled('div')`
  width: 100%;
  height: 72px;
  padding-top: 15px;
  padding-left: 5px;
  padding-right: 5px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  white-space: pre;

  .bp5-dark &:hover,
  .bp5-dark &.active {
    color: #48aff0 !important;
  }

  &:hover,
  &.active {
    background-color: rgba(19, 124, 189, 0.2);
  }

  ${mobileStyle(`
    height: 54px;
    padding-top: 9px;
    min-width: 72px;
    width: min-content;
  `)}
`;

export interface SectionTabProps {
  children: any;
  name: string;
  onClick: any;
  active: boolean;
  iconSize?: number;
}

export const SectionTab = ({ children, name, onClick, active, iconSize }: SectionTabProps) =>
  React.createElement(
    TabContainer,
    { onClick, className: 'raeditor-side-panel-tab' + (active ? ' active' : '') },
    React.createElement('div', { style: { fontSize: (iconSize || 14) + 'px' } }, children),
    React.createElement('div', { style: { paddingTop: '5px' } }, name)
  );
