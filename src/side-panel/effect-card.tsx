'use client';
import React from 'react';
import styled from '../utils/styled';
import { Effects, shapeFilterToCSS } from '../utils/filters';

const CardContainer = styled('div')`
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  width: calc(33% - 16px);
  gap: 8px;
  cursor: pointer;
`;

const CardLabel = styled('span')`
  text-align: center;
`;

const CardFrame = styled('div')`
  position: relative;
  border-radius: 10px;
  box-sizing: border-box;
  height: 90px;
`;

const CardImage = styled('img')`
  height: 100%;
  width: 100%;
  object-fit: cover;
  border-radius: 10px;
`;

const CardBorder = styled('div')`
  left: -4px;
  top: -4px;
  bottom: -4px;
  right: -4px;
  display: flex;
  position: absolute;
  border-radius: 15px;
  padding: 2px;
  transition: 0.2s border;
  border: 2px solid ${(p: any) => p.active ? 'white' : 'transparent'};
`;

const SepiaImage = styled(CardImage)`
  filter: sepia(1);
`;
const GrayscaleImage = styled(CardImage)`
  filter: grayscale(1);
`;
const WarmImage = styled(CardImage)`
  filter: ${shapeFilterToCSS(Effects.warm)?.filter};
`;
const NaturalImage = styled(CardImage)`
  filter: ${shapeFilterToCSS(Effects.natural)?.filter};
`;

const ColdImage = (props: any) => {
  const { html, filter } = shapeFilterToCSS(Effects.cold);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { style: { display: 'none' }, dangerouslySetInnerHTML: { __html: html } }),
    React.createElement(CardImage, { style: { filter }, ...props })
  );
};

function getImageComponent(effect: Effects) {
  switch (effect) {
    case Effects.sepia: return SepiaImage;
    case Effects.grayscale: return GrayscaleImage;
    case Effects.warm: return WarmImage;
    case Effects.cold: return ColdImage;
    case Effects.natural: return NaturalImage;
    default: return CardImage;
  }
}

type EffectCardProps = {
  title: string;
  imageSrc: string;
  effect: Effects;
  active?: boolean;
  onClick?: () => void;
};

export const EffectCard: React.FC<EffectCardProps> = ({ title, imageSrc, effect, onClick, active }) => {
  const ImageComp = getImageComponent(effect);
  return React.createElement(
    CardContainer,
    { onClick },
    React.createElement(
      CardFrame,
      null,
      React.createElement(CardBorder, { active }),
      React.createElement(ImageComp, { src: imageSrc })
    ),
    React.createElement(CardLabel, null, title)
  );
};
