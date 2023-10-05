/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Operation } from '@apollo/client';

import createCat from './createCat.json';
import getCountries from './getCountries.json';
import getCountry from './getCountry.json';

/**
 * - operation type: `"query"`
 * - operation name: `"CountryDetails"`
 * - variables: `{ "code": "BE" }`
 */
export const getCountryOperation = (getCountry as unknown) as Operation;

/**
 * - operation type: `"query"`
 * - operation name: `undefined`
 * - variables: `{}`
 */
export const getCountriesOperation = (getCountries as unknown) as Operation;

/**
 * - operation type: `"mutation"`
 * - operation name: `CreateCat`
 * - variables: `{ "name": "Croute", "age": 22 }`
 */
export const createCatOperation = (createCat as unknown) as Operation;
