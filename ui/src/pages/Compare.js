import React, { Component } from 'react';
import _ from 'lodash'

import { Flex, Box } from 'reflexbox'
import { Container, Heading, Section } from 'rebass'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

import Page from './Page'
import Title from '../components/Title'


function GroupByDay(datapoints) {
  return _.chain(datapoints)
  .groupBy((x) => Math.floor(x.timestamp/86400/1000))
  .map((values, timestamp) => {
    return {
      timestamp: timestamp * 86400 * 1000,
      spend: _.sum(_.map(values, 'spend')),
      impressions: _.sum(_.map(values, 'impressions')),
    };
  })
  .flatten()
  .value()
}

function tickFormatter(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()}/${d.getYear()}`
}

function Chart(props) {
  const grouped = GroupByDay(props.data);
  console.log(grouped);

  return <ResponsiveContainer>
  <LineChart data={grouped} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
   <XAxis dataKey="timestamp" tickFormatter={tickFormatter} />
   <YAxis />
   <CartesianGrid strokeDasharray="3 3" />
   <Tooltip />
   <Legend />
   <Line type="monotone" dataKey="impressions" stroke="#8884d8" />
   <Line type="monotone" dataKey="spend" stroke="#82ca9d" />
  </LineChart>
</ResponsiveContainer>
}


class App extends Component {
  render() {
    const stats = DATA.data;

    return (
      <Page>
        <Container>
          <Title text="Compare" />
          <Box style={{height: 400}}>
            <Chart data={stats} />
          </Box>
        </Container>
      </Page>
    );
  }
}

export default App;