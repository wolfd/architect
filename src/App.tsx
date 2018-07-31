import * as React from 'react';
import './App.css';

import logo from './logo.svg';
import BuildingView from './views/building-view';

class App extends React.Component {
  public render() {
    return (
      <div className="App">
        <BuildingView />
      </div>
    );
  }
}

export default App;
