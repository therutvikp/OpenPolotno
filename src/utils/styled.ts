'use client';

import React from 'react';
import { setup, styled } from './goober';

setup(React.createElement);

// Import theme to trigger global CSS token injection via goober glob().
// This runs once when the module is first loaded.
import './theme';

export default styled;
