/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Config from 'react-native-config';
import {runBenchmarks, saveReport} from './runner';

export default function FlagsScenario() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [report, setReport] = useState('');
  const running = useRef(false);
  const run = useCallback(async (smoke: boolean) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setReport('');
    try {
      saveReport(
        JSON.stringify({
          correctness: 'running',
          startedAt: new Date().toISOString(),
        }),
      );
      const result = await runBenchmarks(setStatus, smoke);
      const json = JSON.stringify(result, null, 2);
      saveReport(json);
      setReport(json);
      setStatus('Completed; correctness checks passed');
      console.log(`FLAGS_BENCHMARK_RESULT ${JSON.stringify(result)}`);
    } catch (error) {
      setStatus(`Failed: ${String(error)}`);
      const failure = JSON.stringify({
        correctness: 'failed',
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      try {
        saveReport(failure);
      } catch {
        console.error(failure);
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (Config.BENCH_FLAGS_AUTORUN === 'smoke') void run(true);
  }, [run]);
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Flag evaluation benchmarks</Text>
        <Text>
          {__DEV__ ? 'Debug build: smoke testing only' : 'Release build'}
        </Text>
        <Text selectable style={styles.status}>
          {status}
        </Text>
        <View style={styles.actions}>
          <Button
            title="Smoke test"
            disabled={busy}
            onPress={() => run(true)}
          />
          <Button
            title="Run benchmark"
            disabled={busy || __DEV__}
            onPress={() => run(false)}
          />
          <Button
            title="Share JSON"
            disabled={busy || !report}
            onPress={() => Share.share({message: report})}
          />
        </View>
        {report ? (
          <Text selectable style={styles.report}>
            {report}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: 'white'},
  content: {padding: 20, gap: 16},
  title: {fontSize: 22, fontWeight: '600', color: '#202124'},
  status: {fontSize: 14, color: '#364152'},
  actions: {gap: 8},
  report: {fontFamily: 'Menlo', fontSize: 11, color: '#202124'},
});
